import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateVertexAuthToken, getVertexProjectId } from "../_shared/vertex-auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateVideoRequest {
  videoGenerationId: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { videoGenerationId, aspectRatio }: GenerateVideoRequest = await req.json();

    console.log('[generate-and-assemble-video] Starting video generation for:', videoGenerationId);

    // Update status
    await supabase
      .from('video_generations')
      .update({ status: 'generating_videos' })
      .eq('id', videoGenerationId);

    // Start background processing
    // @ts-ignore - Deno Deploy waitUntil
    waitUntil(
      processVideoGeneration(supabase, videoGenerationId, aspectRatio)
    );

    return new Response(
      JSON.stringify({ success: true, message: 'Video generation started' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-and-assemble-video] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processVideoGeneration(
  supabase: any, 
  videoGenerationId: string, 
  aspectRatio: string
) {
  try {
    // Get scenes with images
    const { data: scenes, error: scenesError } = await supabase
      .from('video_story_scenes')
      .select('*')
      .eq('video_generation_id', videoGenerationId)
      .order('scene_number');

    if (scenesError) throw scenesError;

    const token = await generateVertexAuthToken();
    const projectId = getVertexProjectId();
    const location = 'us-central1';
    
    let totalCost = 0;
    const clipUrls: string[] = [];

    // Generate video clips using VEO 3.1 Preview Model (MANDATORY for image-to-video)
    for (const scene of scenes) {
      console.log(`[generate-and-assemble-video] Generating clip for scene ${scene.scene_number}`);

      const clipUrl = await generateVideoClipFromImage({
        imageBase64: scene.image_url,
        visualDescription: scene.visual_description,
        duration: scene.duration_seconds,
        aspectRatio,
        token,
        projectId,
        location
      });

      // Calculate cost (VEO Preview Model: $0.15 per 5 seconds)
      const clipCost = (scene.duration_seconds / 5) * 0.15;
      totalCost += clipCost;

      // Update scene with video clip URL
      await supabase
        .from('video_story_scenes')
        .update({ video_clip_url: clipUrl })
        .eq('id', scene.id);

      clipUrls.push(clipUrl);
    }

    // TODO: Implement FFmpeg stitching (placeholder for now)
    const finalVideoUrl = clipUrls[0]; // Use first clip as placeholder

    // Update video generation record
    await supabase
      .from('video_generations')
      .update({
        status: 'completed',
        video_url: finalVideoUrl,
        cost_usd: totalCost,
        veo_model_used: 'veo-3.1-generate-preview',
        intermediate_clips_urls: clipUrls
      })
      .eq('id', videoGenerationId);

    console.log('[generate-and-assemble-video] Video generation completed. Total cost:', totalCost);

  } catch (error) {
    console.error('[generate-and-assemble-video] Background processing error:', error);
    
    await supabase
      .from('video_generations')
      .update({ status: 'failed' })
      .eq('id', videoGenerationId);
  }
}

async function generateVideoClipFromImage(params: {
  imageBase64: string;
  visualDescription: string;
  duration: number;
  aspectRatio: string;
  token: string;
  projectId: string;
  location: string;
}): Promise<string> {
  const { imageBase64, visualDescription, duration, aspectRatio, token, projectId, location } = params;

  console.log(`[VEO 3.1] Generating ${duration}s clip for: "${visualDescription.substring(0, 50)}..."`);

  // VEO 3.1 Generate Preview endpoint (ONLY model supporting image-to-video)
  const endpoint = `https://${location}-aiplatform.googleapis.com/v1beta1/projects/${projectId}/locations/${location}:generateVideos`;

  // Prepare image data (strip data URL prefix if present)
  const imageData = imageBase64.startsWith('data:') 
    ? imageBase64.split(',')[1] 
    : imageBase64;

  // Map aspect ratio to VEO format
  const veoAspectRatio = aspectRatio === '1:1' ? '1:1' : aspectRatio;

  const requestBody = {
    model: 'veo-3.1-generate-preview',
    prompt: `${visualDescription}. Smooth cinematic camera movement. Professional videography.`,
    config: {
      aspectRatio: veoAspectRatio,
      durationSeconds: duration
    },
    referenceImages: [{
      image: {
        bytesBase64Encoded: imageData
      }
    }]
  };

  console.log('[VEO 3.1] Request config:', { 
    model: requestBody.model, 
    aspectRatio: veoAspectRatio, 
    duration 
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[VEO 3.1] API error:', response.status, errorText);
    throw new Error(`VEO 3.1 API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('[VEO 3.1] Response:', JSON.stringify(data).substring(0, 200));
  
  // VEO returns an operation name for async generation
  const operationName = data.name;
  
  if (!operationName) {
    throw new Error('No operation name returned from VEO 3.1');
  }

  console.log('[VEO 3.1] Operation started:', operationName);

  // Poll for completion
  const videoUri = await pollVeoOperation(operationName, token);
  
  console.log('[VEO 3.1] Video URI received:', videoUri);

  // Download and upload to Supabase Storage
  const storedUrl = await downloadAndStoreVideo(videoUri);
  
  console.log('[VEO 3.1] Clip stored at:', storedUrl);

  return storedUrl;
}

async function pollVeoOperation(operationName: string, token: string): Promise<string> {
  const maxAttempts = 60; // 10 minutes max
  let attempts = 0;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s between polls

    const response = await fetch(
      `https://aiplatform.googleapis.com/v1/${operationName}`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    if (!response.ok) {
      throw new Error(`Operation polling failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.done) {
      if (data.error) {
        throw new Error(`VEO generation failed: ${JSON.stringify(data.error)}`);
      }

      const videoUri = data.response?.predictions?.[0]?.videoUri;
      if (!videoUri) {
        throw new Error('No video URI in completed operation');
      }

      return videoUri;
    }

    attempts++;
  }

  throw new Error('VEO operation timed out');
}

async function downloadAndStoreVideo(videoUri: string): Promise<string> {
  console.log('[VEO 3.1] Downloading video from:', videoUri);
  
  // Download video from GCS
  const videoResponse = await fetch(videoUri);
  
  if (!videoResponse.ok) {
    console.error('[VEO 3.1] Download failed:', videoResponse.status);
    throw new Error(`Failed to download video: ${videoResponse.status}`);
  }

  const videoBlob = await videoResponse.blob();
  const videoBuffer = await videoBlob.arrayBuffer();

  console.log('[VEO 3.1] Downloaded video size:', videoBuffer.byteLength, 'bytes');

  // Upload to Supabase Storage
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const fileName = `video-clips/clip-${Date.now()}.mp4`;
  
  const { data, error } = await supabase.storage
    .from('video-clips')
    .upload(fileName, videoBuffer, {
      contentType: 'video/mp4',
      upsert: false
    });

  if (error) {
    console.error('[VEO 3.1] Storage upload failed:', error);
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from('video-clips')
    .getPublicUrl(fileName);

  console.log('[VEO 3.1] Clip uploaded to:', publicUrl);

  return publicUrl;
}
