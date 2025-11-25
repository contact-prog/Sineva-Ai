import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateDirectRequest {
  videoGenerationId: string;
  quality: 'fast' | 'premium';
  referenceImageUrl?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { videoGenerationId, quality, referenceImageUrl } = await req.json() as GenerateDirectRequest;

    console.log(`[Direct Video Gen] Starting for video: ${videoGenerationId}, quality: ${quality}, hasReference: ${!!referenceImageUrl}`);

    // Get video generation record
    const { data: videoGen, error: videoError } = await supabase
      .from('video_generations')
      .select('*')
      .eq('id', videoGenerationId)
      .single();

    if (videoError) throw videoError;

    // Get all scenes for this video
    const { data: scenes, error: scenesError } = await supabase
      .from('video_story_scenes')
      .select('*')
      .eq('video_generation_id', videoGenerationId)
      .order('scene_number');

    if (scenesError) throw scenesError;

    console.log(`[Direct Video Gen] Found ${scenes.length} scenes`);

    // Update status to generating
    await supabase
      .from('video_generations')
      .update({ 
        status: 'generating_videos',
        quality_preference: quality,
        updated_at: new Date().toISOString()
      })
      .eq('id', videoGenerationId);

    // Get Vertex AI token
    const vertexToken = await getVertexToken();

    // Generate videos directly from scene descriptions
    const videoClips = await generateVideosFromText(
      scenes,
      quality,
      vertexToken,
      supabaseUrl,
      supabaseKey,
      referenceImageUrl
    );

    // Update each scene with video URL and cost
    let totalCost = 0;
    for (const clip of videoClips) {
      const scene = scenes.find(s => s.scene_number === clip.sceneNumber);
      if (scene) {
        await supabase
          .from('video_story_scenes')
          .update({
            video_clip_url: clip.videoUrl,
            start_time_ms: clip.startTimeMs,
            end_time_ms: clip.endTimeMs,
          })
          .eq('id', scene.id);

        totalCost += clip.cost;
      }
    }

    // Update video generation record with completion
    const modelUsed = referenceImageUrl 
      ? 'veo-3.1-generate-preview' 
      : (quality === 'fast' ? 'veo-3.1-fast-generate-001' : 'veo-3.1-generate-001');
    
    await supabase
      .from('video_generations')
      .update({
        status: 'videos_generated',
        veo_model_used: modelUsed,
        cost_usd: totalCost,
        intermediate_clips_urls: videoClips.map(c => c.videoUrl),
        updated_at: new Date().toISOString()
      })
      .eq('id', videoGenerationId);

    console.log(`[Direct Video Gen] ✓ Complete. ${videoClips.length} clips, $${totalCost.toFixed(2)} total`);

    return new Response(
      JSON.stringify({
        success: true,
        clipCount: videoClips.length,
        totalCost,
        modelUsed
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Direct Video Gen] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getVertexToken(): Promise<string> {
  const credentials = JSON.parse(Deno.env.get('VERTEX_AI_CREDENTIALS') || '{}');
  
  const jwtHeader = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = btoa(JSON.stringify({
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }));

  const signatureInput = `${jwtHeader}.${jwtPayload}`;
  const privateKey = credentials.private_key;

  const encoder = new TextEncoder();
  const data = encoder.encode(signatureInput);
  const keyData = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keyData, data);
  const jwt = `${signatureInput}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function generateVideosFromText(
  scenes: any[],
  quality: 'fast' | 'premium',
  vertexToken: string,
  supabaseUrl: string,
  supabaseKey: string,
  referenceImageUrl?: string
): Promise<Array<{ sceneNumber: number; videoUrl: string; startTimeMs: number; endTimeMs: number; cost: number }>> {
  // Get Vertex AI project details from credentials
  const credentials = JSON.parse(Deno.env.get('VERTEX_AI_CREDENTIALS') || '{}');
  const projectId = credentials.project_id;
  const location = 'us-central1';
  
  // Select proper VEO 3.1 model
  const modelName = referenceImageUrl 
    ? 'veo-3.1-generate-preview'  // Preview model for image-to-video
    : (quality === 'fast' ? 'veo-3.1-fast-generate-001' : 'veo-3.1-generate-001');
  
  const VERTEX_AI_BASE = `https://${location}-aiplatform.googleapis.com/v1`;
  const videoClips = [];
  let currentTimeMs = 0;

  console.log(`[Video Gen] Using Vertex AI endpoint: ${VERTEX_AI_BASE}`);
  console.log(`[Video Gen] Model: ${modelName}, Quality: ${quality}, Reference: ${!!referenceImageUrl}`);

  // If reference image is provided, download it once for reuse
  let referenceImageBase64: string | undefined;
  if (referenceImageUrl) {
    console.log('[Video Gen] Downloading reference image:', referenceImageUrl);
    const imageResponse = await fetch(referenceImageUrl);
    const imageBlob = await imageResponse.arrayBuffer();
    referenceImageBase64 = btoa(String.fromCharCode(...new Uint8Array(imageBlob)));
  }

  for (const scene of scenes) {
    console.log(`[Scene ${scene.scene_number}] Generating video with ${referenceImageUrl ? 'Preview' : quality} quality...`);

    // Build enhanced prompt for VEO
    let videoPrompt = `${scene.visual_description}. Mood: ${scene.mood}. Professional cinematic quality.`;
    
    // For scenes after the first, reference consistency
    if (referenceImageUrl && scene.scene_number > 1) {
      videoPrompt = `Continue with the same character/product from the reference image: ${videoPrompt}`;
    }

    // Build request body for VEO 3.1 API (proper structure per documentation)
    const requestBody: any = {
      instances: [
        {
          prompt: videoPrompt,
          aspectRatio: '16:9',
          stylePreset: 'cinematic',
          negativePrompt: 'blurry, low quality, distorted, amateur'
        }
      ],
      parameters: {
        sampleCount: 1,
        seed: Date.now()
      }
    };

    // Add reference image for Preview model (proper structure)
    if (referenceImageBase64) {
      requestBody.instances[0].referenceImages = [{
        bytesBase64Encoded: referenceImageBase64,
        imageMetadata: {
          mimeType: 'image/jpeg'
        }
      }];
    }

    // Call Vertex AI VEO API (use :predictLongRunning endpoint)
    const apiUrl = `${VERTEX_AI_BASE}/projects/${projectId}/locations/${location}/publishers/google/models/${modelName}:predictLongRunning`;
    
    console.log(`[VEO API] Calling: ${apiUrl}`);
    
    const startResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vertexToken}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(requestBody)
    });

    if (!startResponse.ok) {
      const errorText = await startResponse.text();
      console.error(`VEO start failed for scene ${scene.scene_number}:`, errorText);
      throw new Error(`VEO API failed: ${startResponse.status}`);
    }

    const operationData = await startResponse.json();
    const operationName = operationData.name;

    // Poll for completion
    const videoFile = await pollVeoOperation(operationName, vertexToken);

    // Download and store
    const videoUrl = await downloadAndStoreVideo(videoFile.uri, supabaseUrl, supabaseKey);

    // Calculate cost per VEO 3.1 pricing (per 5 seconds)
    const costPer5Seconds = referenceImageUrl ? 0.15 : (quality === 'fast' ? 0.04 : 0.12);
    const cost = costPer5Seconds * (scene.duration_seconds / 5);

    const durationMs = scene.duration_seconds * 1000;
    videoClips.push({
      sceneNumber: scene.scene_number,
      videoUrl,
      startTimeMs: currentTimeMs,
      endTimeMs: currentTimeMs + durationMs,
      cost
    });

    currentTimeMs += durationMs;
    console.log(`[Scene ${scene.scene_number}] ✓ Video generated: ${videoUrl}`);
  }

  return videoClips;
}

async function pollVeoOperation(operationName: string, vertexToken: string): Promise<{ uri: string }> {
  const credentials = JSON.parse(Deno.env.get('VERTEX_AI_CREDENTIALS') || '{}');
  const projectId = credentials.project_id;
  const location = 'us-central1';
  const VERTEX_AI_BASE = `https://${location}-aiplatform.googleapis.com/v1`;
  
  const MAX_ATTEMPTS = 60;
  const POLL_INTERVAL = 10000;

  console.log(`[VEO Poll] Starting to poll operation: ${operationName}`);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));

    // Use fetchPredictOperation to check status
    const modelPath = operationName.split('/operations/')[0];
    const pollUrl = `${modelPath}:fetchPredictOperation`;
    
    const pollResponse = await fetch(pollUrl, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${vertexToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        operationName: operationName
      })
    });

    if (!pollResponse.ok) {
      console.error(`[VEO Poll] Attempt ${attempt} failed: ${pollResponse.status}`);
      continue;
    }

    const operation = await pollResponse.json();

    if (operation.error) {
      console.error('[VEO Poll] Operation error:', operation.error);
      throw new Error(`VEO operation failed: ${operation.error.message}`);
    }

    if (operation.done) {
      console.log('[VEO Poll] Operation complete:', JSON.stringify(operation.response));
      
      // Try different response paths
      const videoUri = operation.response?.generatedSamples?.[0]?.video?.uri 
                    || operation.response?.predictions?.[0]?.videoUri
                    || operation.response?.videoUri;
      
      if (videoUri) {
        console.log(`[VEO Poll] ✓ Video URI found: ${videoUri}`);
        return { uri: videoUri };
      }
      
      console.error('[VEO Poll] No video URI in response:', JSON.stringify(operation.response));
      throw new Error('No video URI in completed operation');
    }

    console.log(`[VEO Poll] Attempt ${attempt}/${MAX_ATTEMPTS} - still processing...`);
  }

  throw new Error('VEO operation timeout after 10 minutes');
}

async function downloadAndStoreVideo(fileUri: string, supabaseUrl: string, supabaseKey: string): Promise<string> {
  const videoResponse = await fetch(fileUri);
  if (!videoResponse.ok) throw new Error('Failed to download video');

  const videoBlob = await videoResponse.arrayBuffer();
  const fileName = `video-${Date.now()}-${Math.random().toString(36).substring(7)}.mp4`;

  const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/video-clips/${fileName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'video/mp4',
    },
    body: videoBlob
  });

  if (!uploadResponse.ok) throw new Error('Failed to upload video');

  return `${supabaseUrl}/storage/v1/object/public/video-clips/${fileName}`;
}
