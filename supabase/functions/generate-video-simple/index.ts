import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const EdgeRuntime: {
  waitUntil(promise: Promise<any>): void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// JWT helper
async function getAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600;

  const jwtHeader = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const jwtClaimSet = btoa(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    exp: expiry,
    iat: now,
  }));

  const unsignedJwt = `${jwtHeader}.${jwtClaimSet}`;
  
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(unsignedJwt)
  );

  const signedJwt = `${unsignedJwt}.${btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${signedJwt}`,
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const pemContents = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binaryString = atob(pemContents);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { prompt, duration = 6, aspectRatio = "16:9", quality = "fast", platforms = [] } = await req.json();
    
    console.log(`[Video Simple] User: ${user.id}, Prompt: ${prompt}, Duration: ${duration}s, Aspect: ${aspectRatio}, Quality: ${quality}`);

    // Select model based on quality
    const model = quality === 'fast' 
      ? 'veo-3.1-generate-preview' 
      : 'veo-3.1-generate';

    // Load service account
    const serviceAccountJson = Deno.env.get('VERTEX_AI_CREDENTIALS');
    if (!serviceAccountJson) {
      throw new Error('VERTEX_AI_CREDENTIALS not set');
    }
    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId = serviceAccount.project_id;
    const location = "us-central1";

    const accessToken = await getAccessToken(serviceAccount);

    // Create DB record
    const { data: videoRecord, error: dbError } = await supabase
      .from('video_generations')
      .insert({
        user_id: user.id,
        prompt: prompt,
        user_prompt: prompt,
        duration_seconds: duration,
        resolution: aspectRatio,
        status: 'generating',
        veo_model_used: model,
        platforms: platforms,
        quality_preference: quality,
        generation_mode: 'quick'
      })
      .select()
      .single();

    if (dbError) {
      console.error('[Video Simple] DB error:', dbError);
      throw new Error(`Failed to create video record: ${dbError.message}`);
    }

    console.log(`[Video Simple] Created record: ${videoRecord.id}`);

    // Build VEO payload
    const requestPayload = {
      instances: [{ prompt }],
      parameters: {
        durationSeconds: duration,
        aspectRatio: aspectRatio,
        sampleCount: 1
      }
    };

    // Call VEO API
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:predictLongRunning`;
    
    const generateResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestPayload)
    });

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      console.error('[Video Simple] VEO error:', generateResponse.status, errorText);
      
      await supabase.from('video_generations').update({
        status: 'failed',
        metadata: { error: `VEO API error: ${generateResponse.status}` }
      }).eq('id', videoRecord.id);

      // Detect error type
      let errorType = 'generation_error';
      if (generateResponse.status === 401 || generateResponse.status === 403) {
        errorType = 'authentication_error';
      } else if (generateResponse.status === 429) {
        errorType = 'rate_limit_error';
      }

      return new Response(
        JSON.stringify({ 
          success: false,
          videoId: videoRecord.id,
          error: errorText,
          errorType
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const generateResult = await generateResponse.json();
    const operationName = generateResult.name;
    
    console.log(`[Video Simple] Operation: ${operationName}`);

    // Update with operation
    await supabase.from('video_generations').update({
      metadata: { operationName }
    }).eq('id', videoRecord.id);

    // Start polling in background
    const pollingPromise = pollOperation(
      supabase, 
      videoRecord.id, 
      operationName, 
      projectId, 
      location, 
      model, 
      accessToken,
      duration
    ).catch(error => {
      console.error(`[Video Simple] Polling error:`, error);
      return supabase.from('video_generations').update({
        status: 'failed',
        metadata: { error: error.message }
      }).eq('id', videoRecord.id);
    });
    
    EdgeRuntime.waitUntil(pollingPromise);

    return new Response(
      JSON.stringify({
        success: true,
        videoId: videoRecord.id,
        message: 'Video generation started'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("[Video Simple] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function pollOperation(
  supabase: any,
  videoId: string,
  operationName: string,
  projectId: string,
  location: string,
  model: string,
  accessToken: string,
  durationSeconds: number
) {
  console.log(`[Video ${videoId}] Polling started`);
  const startTime = Date.now();
  let attempts = 0;
  const maxAttempts = 60; // 10 minutes (10s intervals)

  while (attempts < maxAttempts) {
    attempts++;
    await new Promise(resolve => setTimeout(resolve, 10000)); // 10s

    try {
      const pollEndpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:fetchPredictOperation`;
      
      const pollResponse = await fetch(pollEndpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ operationName })
      });

      if (!pollResponse.ok) {
        console.error(`[Video ${videoId}] Poll error: ${pollResponse.status}`);
        continue;
      }

      const pollResult = await pollResponse.json();
      console.log(`[Video ${videoId}] Poll ${attempts}: done=${pollResult.done}`);

      if (pollResult.done && pollResult.response?.videos?.length > 0) {
        const video = pollResult.response.videos[0];
        const gcsUri = video.gcsUri;
        const base64Bytes = video.bytesBase64Encoded;

        console.log(`[Video ${videoId}] Complete! GCS: ${!!gcsUri}, Base64: ${!!base64Bytes}`);

        let publicUrl: string | null = null;

        if (gcsUri) {
          publicUrl = await downloadAndUploadVideo(supabase, gcsUri, videoId, accessToken);
        } else if (base64Bytes) {
          const binaryString = atob(base64Bytes);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          const fileName = `${videoId}.mp4`;
          const { error: uploadError } = await supabase.storage
            .from('videos')
            .upload(fileName, bytes.buffer, { contentType: 'video/mp4', upsert: true });
          
          if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
          
          const { data: { publicUrl: url } } = supabase.storage
            .from('videos')
            .getPublicUrl(fileName);
          publicUrl = url;
        }

        if (publicUrl) {
          const generationTime = Math.floor((Date.now() - startTime) / 1000);
          
          // Generate thumbnail (first frame)
          const thumbnailUrl = publicUrl; // Use video URL as thumbnail for now
          
          await supabase.from('video_generations').update({
            status: 'completed',
            video_url: publicUrl,
            thumbnail_url: thumbnailUrl,
            generation_time_seconds: generationTime,
            cost_usd: durationSeconds * 0.05 // Rough estimate
          }).eq('id', videoId);

          console.log(`[Video ${videoId}] SUCCESS! URL: ${publicUrl}`);
          return;
        }
      }
    } catch (error) {
      console.error(`[Video ${videoId}] Poll attempt ${attempts} error:`, error);
    }
  }

  // Timeout
  await supabase.from('video_generations').update({
    status: 'failed',
    metadata: { error: 'Generation timeout after 10 minutes' }
  }).eq('id', videoId);
  
  throw new Error('Timeout');
}

async function downloadAndUploadVideo(
  supabase: any,
  gcsUri: string,
  videoId: string,
  accessToken: string
): Promise<string> {
  console.log(`[Video ${videoId}] Downloading from GCS: ${gcsUri}`);
  
  const gcsUrl = gcsUri.replace('gs://', 'https://storage.googleapis.com/');
  const downloadResponse = await fetch(gcsUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!downloadResponse.ok) {
    throw new Error(`GCS download failed: ${downloadResponse.status}`);
  }

  const videoBlob = await downloadResponse.blob();
  const buffer = await videoBlob.arrayBuffer();

  const fileName = `${videoId}.mp4`;
  const { error: uploadError } = await supabase.storage
    .from('videos')
    .upload(fileName, buffer, { contentType: 'video/mp4', upsert: true });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from('videos')
    .getPublicUrl(fileName);

  console.log(`[Video ${videoId}] Uploaded to storage: ${publicUrl}`);
  return publicUrl;
}
