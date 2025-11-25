import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";

// Declare EdgeRuntime global for background tasks
declare const EdgeRuntime: {
  waitUntil(promise: Promise<any>): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VideoGenerationRequest {
  startFrameUrl: string;
  endFrameUrl?: string;
  prompt?: string;
  aspectRatio?: string;
  duration?: number;
  mode: 'frame_to_video' | 'whisk_to_video';
  model?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const body: VideoGenerationRequest = await req.json();
    const {
      startFrameUrl,
      endFrameUrl,
      prompt = "Generate a smooth, cinematic video transition",
      aspectRatio = "16:9",
      duration = 5,
      mode,
      model = "veo-3.1-generate-preview" // Accept model from frontend, default to veo-3.1
    } = body;

    console.log(`🎬 Frame-based video generation request:`, {
      mode,
      hasStartFrame: !!startFrameUrl,
      hasEndFrame: !!endFrameUrl,
      aspectRatio,
      duration
    });

    if (!startFrameUrl) {
      throw new Error("Start frame is required");
    }

    // Get Vertex AI credentials
    const serviceAccountJson = Deno.env.get("VERTEX_AI_CREDENTIALS");
    if (!serviceAccountJson) {
      throw new Error("Missing Vertex AI credentials");
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId = serviceAccount.project_id;
    const location = "us-central1";

    // Get OAuth token
    const jwtHeader = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const now = Math.floor(Date.now() / 1000);
    const jwtClaimSet = {
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    };
    const jwtClaimSetEncoded = btoa(JSON.stringify(jwtClaimSet));
    const signatureInput = `${jwtHeader}.${jwtClaimSetEncoded}`;

    const encoder = new TextEncoder();
    const data = encoder.encode(signatureInput);
    const privateKeyPem = serviceAccount.private_key
      .replace(/-----BEGIN PRIVATE KEY-----/, "")
      .replace(/-----END PRIVATE KEY-----/, "")
      .replace(/\s/g, "");
    const binaryKey = Uint8Array.from(atob(privateKeyPem), (c) => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryKey,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, data);
    const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const jwt = `${jwtHeader}.${jwtClaimSetEncoded}.${signatureBase64}`;

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    if (!tokenResponse.ok) {
      throw new Error(`Failed to get access token: ${tokenResponse.status}`);
    }

    const { access_token } = await tokenResponse.json();

    // Convert frame URLs to base64 and detect mime type
    const getBase64FromUrl = async (url: string): Promise<{ base64: string; mimeType: string | null }> => {
      if (url.startsWith('data:')) {
        const [meta, data] = url.split(',');
        const mimeMatch = /^data:(.*?);base64$/.exec(meta);
        return { base64: data, mimeType: mimeMatch ? mimeMatch[1] : null };
      }

      const response = await fetch(url);
      const mimeType = response.headers.get('Content-Type');
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // Process in chunks to avoid stack overflow with large images
      const chunkSize = 8192;
      let binary = '';
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
      }

      return { base64: btoa(binary), mimeType };
    };

    const { base64: startFrameBase64, mimeType: startMime } = await getBase64FromUrl(startFrameUrl);
    const endResult = endFrameUrl ? await getBase64FromUrl(endFrameUrl) : null;
    const endFrameBase64 = endResult?.base64 || null;
    const endMime = endResult?.mimeType || null;

    console.log(`✅ Frames converted to base64`);

    // Create video record
    const { data: videoRecord, error: insertError } = await supabase
      .from("videos")
      .insert({
        user_id: user.id,
        title: `${mode === 'whisk_to_video' ? 'Whisk' : 'Frame-based'} Video`,
        prompt,
        status: "processing",
        duration_seconds: duration,
        mode,
        start_frame_url: startFrameUrl
      })
      .select()
      .single();

    if (insertError || !videoRecord) {
      console.error("Failed to create video record:", insertError);
      throw new Error("Failed to create video record");
    }

    console.log(`✅ Created video record: ${videoRecord.id}`);

    // Prepare Veo API request - use model from request body
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:predictLongRunning`;
    
    console.log(`🎬 Using model: ${model} for video generation`);

    const instancePayload: any = {
      prompt,
      image: {
        bytesBase64Encoded: startFrameBase64,
        mimeType: startMime || "image/png"
      }
    };

    // Add end frame if provided (must be in instances, not parameters)
    if (endFrameBase64) {
      instancePayload.lastFrame = {
        bytesBase64Encoded: endFrameBase64,
        mimeType: endMime || "image/png"
      };
      console.log(`✅ End frame included in payload`);
    }

    const payload = {
      instances: [instancePayload],
      parameters: {
        sampleCount: 1,
        aspectRatio,
        durationSeconds: duration
      }
    };

    console.log(`📤 Sending request to Veo API with ${endFrameBase64 ? 'start + end frames' : 'start frame only'}`);

    const veoResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!veoResponse.ok) {
      const errorText = await veoResponse.text();
      console.error(`❌ Veo API error: ${veoResponse.status}`, errorText);
      
      await supabase
        .from("videos")
        .update({ 
          status: "failed",
          error_message: `Veo API error: ${veoResponse.status}`
        })
        .eq("id", videoRecord.id);

      throw new Error(`Veo API error: ${veoResponse.status}`);
    }

    const operationData = await veoResponse.json();
    const operationName = operationData.name;

    console.log(`✅ Video generation started: ${operationName}`);

    // Update video record with operation name
    await supabase
      .from("videos")
      .update({ 
        status: "processing",
        model,
        operation_name: operationName
      })
      .eq("id", videoRecord.id);

    // Start background polling with model parameter
    const pollingPromise = pollVideoOperation(
      supabase,
      videoRecord.id,
      operationName,
      access_token,
      projectId,
      location,
      model
    ).catch((error) => {
      console.error(`[Video ${videoRecord.id}] CRITICAL: Polling promise rejected:`, error);
      return supabase.from('videos').update({
        status: 'failed',
        error_message: `Polling failed: ${error.message}`
      }).eq('id', videoRecord.id);
    });
    
    EdgeRuntime.waitUntil(pollingPromise);

    return new Response(
      JSON.stringify({ 
        success: true, 
        videoId: videoRecord.id,
        operationName 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Error in generate-video-from-frames:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "An error occurred" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

async function pollVideoOperation(
  supabase: any,
  videoId: string,
  operationName: string,
  accessToken: string,
  projectId: string,
  location: string,
  model: string
) {
  console.log(`[Video ${videoId}] 🚀 pollVideoOperation STARTED - operationName: ${operationName}`);
  
  try {
    let done = false;
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes max (10s intervals) - industry standard timeout

    while (!done && attempts < maxAttempts) {
      attempts++;
      
      // Check if user cancelled
      const { data: videoCheck } = await supabase
        .from('videos')
        .select('status')
        .eq('id', videoId)
        .maybeSingle();
      
      if (videoCheck?.status === 'cancelled') {
        console.log(`[Video ${videoId}] ⛔ Cancelled by user, stopping polling`);
        return;
      }
      
      // Fixed 10s interval for consistent timeout (5 minutes total)
      await new Promise(resolve => setTimeout(resolve, 10000));

      try {
        // Use the same polling endpoint as the working function
        const pollEndpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:fetchPredictOperation`;
        
        console.log(`[Video ${videoId}] 📡 Poll attempt ${attempts}/${maxAttempts} to ${pollEndpoint}`);
        
        const pollResponse = await fetch(pollEndpoint, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ operationName })
        });

        if (!pollResponse.ok) {
          const errorText = await pollResponse.text();
          console.error(`[Video ${videoId}] ❌ Poll attempt ${attempts} failed: ${pollResponse.status} - ${errorText}`);
          
          // If we get a persistent 4xx error after many attempts, mark as failed
          if (attempts > 5 && pollResponse.status >= 400 && pollResponse.status < 500) {
            await retryDbUpdate(supabase, videoId, {
              status: 'failed',
              error_message: `API error after ${attempts} attempts: ${pollResponse.status}`,
            }, 5);
            return;
          }
          continue;
        }

        const pollResult = await pollResponse.json();
        done = pollResult.done;
        
        console.log(`[Video ${videoId}] 📊 Poll result: done=${done}, hasResponse=${!!pollResult.response}, hasVideos=${!!pollResult.response?.videos}`);

        if (done) {
          if (pollResult.error) {
            console.error(`[Video ${videoId}] ❌ Video generation failed:`, pollResult.error);
            await retryDbUpdate(supabase, videoId, {
              status: 'failed',
              error_message: pollResult.error.message || 'Unknown error'
            }, 5);
            return;
          }

          // Extract video data and persist to storage
          const video = pollResult.response?.videos?.[0] || pollResult.response?.predictions?.[0] || {};
          const gcsUri: string | undefined = video.gcsUri || video.gcs_uri;
          const base64Bytes: string | undefined = video.bytesBase64Encoded;
          const mimeType: string = video.mimeType || 'video/mp4';

          let publicUrl: string | null = null;

          if (gcsUri) {
            console.log(`[Video ${videoId}] Video ready at GCS: ${gcsUri}`);
            publicUrl = await downloadAndUploadVideo(supabase, gcsUri, videoId, accessToken);
          } else if (base64Bytes) {
            console.log(`[Video ${videoId}] Video bytes returned, uploading to storage...`);
            const binaryString = atob(base64Bytes);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
            const buffer = bytes.buffer;

            const fileName = `${videoId}.mp4`;
            const { error: uploadError } = await supabase.storage
              .from('videos')
              .upload(fileName, buffer, { contentType: mimeType, upsert: true });
            if (uploadError) {
              console.error(`[Video ${videoId}] ❌ Storage upload failed:`, uploadError);
              await retryDbUpdate(supabase, videoId, { status: 'failed', error_message: `Storage upload failed: ${uploadError.message}` }, 5);
              return;
            }
            const { data: { publicUrl: url } } = supabase.storage
              .from('videos')
              .getPublicUrl(fileName);
            publicUrl = url;
          } else {
            console.error(`[Video ${videoId}] ❌ No video URL or bytes in response:`, JSON.stringify(pollResult));
            await retryDbUpdate(supabase, videoId, {
              status: 'failed',
              error_message: 'No video data returned from API'
            }, 5);
            return;
          }

          const updateSuccess = await retryDbUpdate(supabase, videoId, {
            status: 'completed',
            video_url: publicUrl,
            progress: 100
          }, 5);

          if (!updateSuccess) {
            console.error(`[Video ${videoId}] ❌❌ CRITICAL: Failed to mark video as completed after all retries`);
          }
          return;
        }

        console.log(`[Video ${videoId}] ⏳ Poll attempt ${attempts}/${maxAttempts}: Still processing...`);

      } catch (pollError) {
        console.error(`[Video ${videoId}] ❌ Polling error (attempt ${attempts}):`, pollError);
        // Continue to next attempt
      }
    }

    // Max attempts reached (5 minute timeout)
    console.error(`[Video ${videoId}] ❌ Max polling attempts (${maxAttempts}) reached - 5 minute timeout`);
    await retryDbUpdate(supabase, videoId, {
      status: 'failed',
      error_message: 'Generation timeout (5 min limit exceeded)'
    }, 5);

  } catch (error) {
    console.error(`[Video ${videoId}] ❌❌ CRITICAL polling error:`, error);
    await retryDbUpdate(supabase, videoId, {
      status: 'failed',
      error_message: `Polling failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, 5);
  }
}

// Helper to retry DB updates with exponential backoff
async function retryDbUpdate(
  supabase: any,
  videoId: string,
  updates: any,
  maxRetries = 3
): Promise<boolean> {
  console.log(`[Video ${videoId}] 🔄 Attempting DB update (max ${maxRetries} retries):`, Object.keys(updates).join(', '));
  
  for (let i = 0; i < maxRetries; i++) {
    const { error } = await supabase
      .from('videos')
      .update(updates)
      .eq('id', videoId);
    
    if (!error) {
      console.log(`[Video ${videoId}] ✅ DB update successful on attempt ${i + 1}`);
      return true;
    }
    
    console.error(`[Video ${videoId}] ❌ DB update attempt ${i + 1}/${maxRetries} failed:`, error.message || error);
    
    if (i < maxRetries - 1) {
      const delay = (i + 1) * 1000; // 1s, 2s, 3s
      console.log(`[Video ${videoId}] ⏳ Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  console.error(`[Video ${videoId}] ❌❌ DB update FAILED after ${maxRetries} attempts`);
  return false;
}

// Download video from GCS (gs://) and upload to Supabase Storage, return public URL
async function downloadAndUploadVideo(
  supabase: any,
  gcsUri: string,
  videoId: string,
  accessToken: string
): Promise<string> {
  try {
    console.log(`Downloading video from: ${gcsUri}`);

    // Convert gs:// URI to https:// URL
    const httpsUrl = gcsUri.replace('gs://', 'https://storage.googleapis.com/');

    // Download video
    const response = await fetch(httpsUrl);
    if (!response.ok) {
      throw new Error(`Failed to download from GCS: ${response.status}`);
    }
    const videoBuffer = await response.arrayBuffer();

    // Upload to Supabase Storage
    const fileName = `${videoId}.mp4`;
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, videoBuffer, {
        contentType: 'video/mp4',
        upsert: true,
      });
    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = await supabase.storage
      .from('videos')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error(`[Video ${videoId}] ❌ Failed to download/upload video:`, error);
    throw error;
  }
}
