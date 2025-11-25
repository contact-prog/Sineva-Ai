import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QuickVideoRequest {
  // Core parameters
  prompt: string;
  generationMode: 'text-to-video' | 'image-to-video' | 'frames-to-video' | 'scene-extension' | 'ingredients-to-video';
  
  // Video settings
  duration: 4 | 6 | 8;
  aspectRatio: '16:9' | '9:16';
  resolution: '720p' | '1080p';
  quality: 'fast' | 'standard';
  includeAudio: boolean;
  
  // Reference media (optional, depends on mode)
  referenceImageUrl?: string; // For image-to-video
  referenceImagesUrls?: string[]; // For ingredients-to-video (max 3)
  firstFrameUrl?: string; // For frames-to-video
  lastFrameUrl?: string; // For frames-to-video
  baseVideoUrl?: string; // For scene-extension
  originalVideoId?: string; // For tracking extensions
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { 
      prompt, 
      generationMode = 'text-to-video',
      duration, 
      aspectRatio, 
      resolution = '720p',
      quality = 'fast', 
      includeAudio = true,
      referenceImageUrl,
      referenceImagesUrls,
      firstFrameUrl,
      lastFrameUrl,
      baseVideoUrl,
      originalVideoId
    } = await req.json() as QuickVideoRequest;

    // Validate inputs
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new Error('Prompt is required and must be a non-empty string');
    }

    if (![4, 6, 8].includes(duration)) {
      throw new Error('Duration must be 4, 6, or 8 seconds (VEO 3.1 limitation)');
    }

    if (!['16:9', '9:16'].includes(aspectRatio)) {
      throw new Error('Aspect ratio must be 16:9 or 9:16 (VEO 3.1 supported ratios)');
    }

    if (!['720p', '1080p'].includes(resolution)) {
      throw new Error('Resolution must be 720p or 1080p');
    }

    if (!['fast', 'standard'].includes(quality)) {
      throw new Error('Quality must be fast or standard');
    }

    const validModes = ['text-to-video', 'image-to-video', 'frames-to-video', 'scene-extension', 'ingredients-to-video'];
    if (!validModes.includes(generationMode)) {
      throw new Error(`Generation mode must be one of: ${validModes.join(', ')}`);
    }

    // Mode-specific validations
    if (generationMode === 'image-to-video' && !referenceImageUrl) {
      throw new Error('Reference image URL is required for image-to-video mode');
    }

    if (generationMode === 'frames-to-video' && (!firstFrameUrl || !lastFrameUrl)) {
      throw new Error('Both first frame and last frame URLs are required for frames-to-video mode');
    }

    if (generationMode === 'scene-extension' && !baseVideoUrl) {
      throw new Error('Base video URL is required for scene-extension mode');
    }

    if (generationMode === 'ingredients-to-video') {
      if (quality !== 'standard') {
        throw new Error('Ingredients-to-video mode is only available with VEO 3.1 Standard');
      }
      if (!referenceImagesUrls || referenceImagesUrls.length < 2 || referenceImagesUrls.length > 3) {
        throw new Error('Ingredients-to-video requires 2-3 reference images');
      }
    }

    console.log("Quick video generation started:", { prompt, generationMode, duration, aspectRatio, resolution, quality, includeAudio });

    // Check usage limits before processing
    const { data: usageCheck, error: usageError } = await supabase.functions.invoke(
      'check-usage-limit',
      { body: { serviceType: 'videos', creditsNeeded: 1 } }
    );

    if (usageError || !usageCheck?.allowed) {
      return new Response(
        JSON.stringify({ 
          error: usageCheck?.message || 'Usage limit exceeded',
          needsUpgrade: usageCheck?.needsUpgrade,
          currentPlan: usageCheck?.currentPlan
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If this is an extension, update the original video's extension count
    if (generationMode === 'scene-extension' && originalVideoId) {
      const { data: originalData } = await supabase
        .from('video_generations')
        .select('extension_count')
        .eq('id', originalVideoId)
        .single();
      
      if (originalData) {
        await supabase
          .from('video_generations')
          .update({ extension_count: (originalData.extension_count || 0) + 1 })
          .eq('id', originalVideoId);
      }
    }

    // Create video generation record
    const { data: videoRecord, error: recordError } = await supabase
      .from("video_generations")
      .insert({
        user_id: user.id,
        prompt: prompt,
        user_prompt: prompt,
        duration_seconds: duration,
        platforms: [aspectRatio],
        status: 'generating',
        generation_mode: generationMode,
        resolution,
        include_audio: includeAudio,
        video_quality: quality,
        reference_image_url: referenceImageUrl,
        reference_images_urls: referenceImagesUrls,
        first_frame_url: firstFrameUrl,
        last_frame_url: lastFrameUrl,
        base_video_url: baseVideoUrl,
        is_extension: generationMode === 'scene-extension',
        original_video_id: originalVideoId,
        is_automated: false,
        metadata: { aspectRatio, resolution }
      })
      .select()
      .single();

    if (recordError) {
      console.error("Failed to create video generation record:", recordError);
      throw new Error(`Failed to create video generation record: ${recordError.message}`);
    }

    console.log("Video generation record created:", videoRecord.id, { generationMode });

    // Generate Vertex AI credentials
    const vertexCredentials = JSON.parse(Deno.env.get("VERTEX_AI_CREDENTIALS") || "{}");
    const vertexToken = await generateVertexAuthToken(vertexCredentials);
    const projectId = vertexCredentials.project_id;

    // Select VEO 3.0 model based on quality
    const modelId = quality === 'fast' ? 'veo-3.0-fast-generate-001' : 'veo-3.0-generate-001';
    console.log(`Using VEO 3.0 model: ${modelId}`, { generationMode, resolution, includeAudio });

    // Start background video generation
    const backgroundTask = async () => {
      try {
        const videoUrl = await generateVideoVeo31({
          prompt,
          generationMode,
          duration,
          aspectRatio,
          resolution,
          quality,
          includeAudio,
          modelId,
          vertexToken,
          projectId,
          supabaseUrl,
          supabaseKey,
          referenceImageUrl,
          referenceImagesUrls,
          firstFrameUrl,
          lastFrameUrl,
          baseVideoUrl
        });

        // Calculate cost (VEO 3.1 pricing)
        let costPerSecond: number;
        if (quality === 'fast') {
          costPerSecond = includeAudio ? 0.40 : 0.25;
        } else {
          costPerSecond = includeAudio ? 0.75 : 0.50;
        }
        const totalCost = costPerSecond * duration;

        // Update record with results
        await supabase
          .from("video_generations")
          .update({
            video_url: videoUrl,
            status: 'completed',
            cost_usd: totalCost,
            veo_model_used: modelId,
            updated_at: new Date().toISOString()
          })
          .eq("id", videoRecord.id);

        // Increment usage counter
        await supabase.functions.invoke('increment-usage', {
          body: {
            serviceType: 'videos',
            operationType: 'quick_video_generation',
            creditsUsed: 1,
            metadata: { duration, quality, generationMode }
          }
        });

        console.log("Quick video generation completed successfully");
      } catch (error) {
        console.error("Background video generation error:", error);

        await supabase
          .from("video_generations")
          .update({
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq("id", videoRecord.id);
      }
    };

    EdgeRuntime.waitUntil(backgroundTask());

    // Return immediately with video ID
    let costPerSecond: number;
    if (quality === 'fast') {
      costPerSecond = includeAudio ? 0.40 : 0.25;
    } else {
      costPerSecond = includeAudio ? 0.75 : 0.50;
    }
    const estimatedCost = costPerSecond * duration;
    const estimatedTime = quality === 'fast' ? '45-60 seconds' : '90-180 seconds';

    return new Response(
      JSON.stringify({
        success: true,
        videoId: videoRecord.id,
        status: 'generating',
        estimatedCost: estimatedCost,
        estimatedTime: estimatedTime,
        message: 'Video generation started. Poll the database for completion status.'
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Quick video generation error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

async function generateVertexAuthToken(credentials: any): Promise<string> {
  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: credentials.private_key_id
  };

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const encodedClaim = btoa(JSON.stringify(claim)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const signatureInput = `${encodedHeader}.${encodedClaim}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(credentials.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(signatureInput));
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const jwt = `${signatureInput}.${encodedSignature}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  const data = await response.json();
  return data.access_token;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function generateVideoVeo31(params: {
  prompt: string;
  generationMode: string;
  duration: number;
  aspectRatio: string;
  resolution: string;
  quality: string;
  includeAudio: boolean;
  modelId: string;
  vertexToken: string;
  projectId: string;
  supabaseUrl: string;
  supabaseKey: string;
  referenceImageUrl?: string;
  referenceImagesUrls?: string[];
  firstFrameUrl?: string;
  lastFrameUrl?: string;
  baseVideoUrl?: string;
}): Promise<string> {
  const {
    prompt,
    generationMode,
    duration,
    aspectRatio,
    resolution,
    includeAudio,
    modelId,
    vertexToken,
    projectId,
    supabaseUrl,
    supabaseKey,
    referenceImageUrl,
    referenceImagesUrls,
    firstFrameUrl,
    lastFrameUrl,
    baseVideoUrl
  } = params;
  
  const VERTEX_AI_BASE = 'https://us-central1-aiplatform.googleapis.com/v1';
  
  console.log(`Generating video with VEO 3.0 (${modelId})...`);

  // Construct VEO 3.1 API request payload (using snake_case as per VEO 3.1 API spec)
  const veoPayload: any = {
    prompt,
    aspect_ratio: aspectRatio,
    resolution,
    duration_seconds: duration,
    generate_audio: includeAudio
  };
  
  console.log('[VEO 3.1] Building payload for mode:', generationMode);

  // Add mode-specific parameters
  if (generationMode === 'image-to-video' && referenceImageUrl) {
    console.log('[VEO 3.1] Fetching reference image for image-to-video mode...');
    const imageResponse = await fetch(referenceImageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch reference image: ${imageResponse.status}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
    veoPayload.image = imageBase64;
    console.log('[VEO 3.1] Reference image encoded');
  }

  if (generationMode === 'frames-to-video' && firstFrameUrl && lastFrameUrl) {
    console.log('[VEO 3.1] Fetching frames for frames-to-video mode...');
    const firstResponse = await fetch(firstFrameUrl);
    if (!firstResponse.ok) {
      throw new Error(`Failed to fetch first frame: ${firstResponse.status}`);
    }
    const firstBuffer = await firstResponse.arrayBuffer();
    const firstBase64 = btoa(String.fromCharCode(...new Uint8Array(firstBuffer)));
    
    const lastResponse = await fetch(lastFrameUrl);
    if (!lastResponse.ok) {
      throw new Error(`Failed to fetch last frame: ${lastResponse.status}`);
    }
    const lastBuffer = await lastResponse.arrayBuffer();
    const lastBase64 = btoa(String.fromCharCode(...new Uint8Array(lastBuffer)));
    
    veoPayload.image = firstBase64;
    veoPayload.last_frame = lastBase64;
    console.log('[VEO 3.1] Both frames encoded');
  }

  if (generationMode === 'scene-extension' && baseVideoUrl) {
    console.log('[VEO 3.1] Fetching base video for scene-extension mode...');
    const videoResponse = await fetch(baseVideoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to fetch base video: ${videoResponse.status}`);
    }
    const videoBuffer = await videoResponse.arrayBuffer();
    const videoBase64 = btoa(String.fromCharCode(...new Uint8Array(videoBuffer)));
    veoPayload.video = videoBase64;
    console.log('[VEO 3.1] Base video encoded');
  }

  if (generationMode === 'ingredients-to-video' && referenceImagesUrls && referenceImagesUrls.length > 0) {
    console.log(`[VEO 3.1] Fetching ${referenceImagesUrls.length} reference images for ingredients-to-video mode...`);
    const imagePromises = referenceImagesUrls.map(async (url, index) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch reference image ${index + 1}: ${response.status}`);
      }
      const buffer = await response.arrayBuffer();
      return btoa(String.fromCharCode(...new Uint8Array(buffer)));
    });
    veoPayload.reference_images = await Promise.all(imagePromises);
    console.log('[VEO 3.1] All reference images encoded');
  }

  console.log('[VEO 3.1] Final payload structure (media redacted):', JSON.stringify({
    ...veoPayload,
    image: veoPayload.image ? `[base64: ${veoPayload.image.length} chars]` : undefined,
    video: veoPayload.video ? `[base64: ${veoPayload.video.length} chars]` : undefined,
    last_frame: veoPayload.last_frame ? `[base64: ${veoPayload.last_frame.length} chars]` : undefined,
    reference_images: veoPayload.reference_images ? `[${veoPayload.reference_images.length} images]` : undefined
  }, null, 2));

  // VEO 3.0 uses :generateVideos endpoint
  const veoEndpoint = `${VERTEX_AI_BASE}/projects/${projectId}/locations/us-central1/publishers/google/models/${modelId}:generateVideos`;
  console.log(`[VEO 3.0] Calling API endpoint: ${veoEndpoint}`);

  const generateResponse = await fetch(veoEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${vertexToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(veoPayload)
  });

  if (!generateResponse.ok) {
    const errorText = await generateResponse.text();
    console.error("[VEO 3.1] Generation request failed:", generateResponse.status, errorText);
    throw new Error(`VEO 3.1 generation failed: ${generateResponse.status} - ${errorText}`);
  }

  console.log('[VEO 3.1] Generation request successful, parsing response...');
  const operationData = await generateResponse.json();
  
  // VEO 3.1 may return videos directly or an operation
  if (operationData.videos && operationData.videos.length > 0) {
    const base64Video = operationData.videos[0].bytesBase64Encoded;
    if (base64Video) {
      console.log("VEO 3.1 returned video directly");
      const videoUrl = await uploadBase64VideoToStorage(base64Video, supabaseUrl, supabaseKey);
      return videoUrl;
    }
  }

  // If operation is returned, poll for completion
  const operationName = operationData.name;
  if (!operationName) {
    throw new Error('VEO 3.1 API did not return operation name or video data');
  }

  console.log("VEO 3.1 operation started:", operationName);

  const { base64Video } = await pollVeo31Operation(operationName, vertexToken, projectId);

  console.log("VEO 3.1 generation completed, uploading video to storage...");

  const videoUrl = await uploadBase64VideoToStorage(base64Video, supabaseUrl, supabaseKey);

  return videoUrl;
}

async function pollVeo31Operation(
  operationName: string,
  vertexToken: string,
  projectId: string
): Promise<{ base64Video: string }> {
  const VERTEX_AI_BASE = 'https://us-central1-aiplatform.googleapis.com/v1';
  const MAX_ATTEMPTS = 60; // 10 minutes max
  const POLL_INTERVAL = 10000; // 10 seconds

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));

    const pollUrl = `${VERTEX_AI_BASE}/${operationName}`;
    
    const pollResponse = await fetch(pollUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${vertexToken}`,
        "Content-Type": "application/json"
      }
    });

    if (!pollResponse.ok) {
      console.error(`Poll attempt ${attempt} failed: ${pollResponse.status}`);
      const errorText = await pollResponse.text();
      console.error(`Error details: ${errorText}`);
      continue;
    }

    const operation = await pollResponse.json();

    if (operation.error) {
      throw new Error(`VEO 3.1 operation failed: ${JSON.stringify(operation.error)}`);
    }

    if (operation.done) {
      const base64Video = operation.response?.videos?.[0]?.bytesBase64Encoded;
      
      if (!base64Video) {
        console.error('[VEO 3.1] No base64 video data found in response');
        console.error('[VEO 3.1] Response structure:', JSON.stringify(operation.response, null, 2));
        throw new Error('VEO 3.1 operation completed but no video data in response');
      }
      
      console.log(`[VEO 3.1] Video generated successfully after ${attempt * POLL_INTERVAL / 1000}s`);
      console.log(`[VEO 3.1] Video data size: ${base64Video.length} bytes (base64)`);
      return { base64Video };
    }

    console.log(`Poll attempt ${attempt}/${MAX_ATTEMPTS}: Operation in progress...`);
  }

  throw new Error("VEO 3.1 operation timeout: Video generation took too long");
}

async function uploadBase64VideoToStorage(
  base64Video: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<string> {
  console.log(`Decoding base64 video data (${base64Video.length} characters)`);
  
  const binaryString = atob(base64Video);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const fileName = `quick-video-${Date.now()}-${Math.random().toString(36).substring(7)}.mp4`;

  const uploadResponse = await fetch(
    `${supabaseUrl}/storage/v1/object/final-videos/${fileName}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'video/mp4',
      },
      body: bytes
    }
  );

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Failed to upload video to storage: ${uploadResponse.status} - ${errorText}`);
  }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/final-videos/${fileName}`;
  console.log("Video uploaded successfully:", publicUrl);
  
  return publicUrl;
}
