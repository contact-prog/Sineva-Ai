import { Scene } from './scene-planner.ts';
import { SceneImage } from './image-generator.ts';

export type VeoModel = 'standard' | 'fast';

export interface VideoClip {
  sceneNumber: number;
  videoUrl: string;
  startTimeMs: number;
  endTimeMs: number;
  cost: number;
  modelUsed: string;
}

interface GenerateVideoClipsParams {
  sceneImages: SceneImage[];
  scenes: Scene[];
  vertexToken: string;
  quality: VeoModel;
  supabaseUrl: string;
  supabaseKey: string;
}

interface VeoOperation {
  name: string;
  done: boolean;
  response?: {
    generatedVideo: {
      uri: string;
    };
  };
  error?: {
    message: string;
    code: number;
  };
}

export async function generateVideoClips(params: GenerateVideoClipsParams): Promise<VideoClip[]> {
  const { sceneImages, scenes, vertexToken, quality, supabaseUrl, supabaseKey } = params;

  const modelName = quality === 'standard' 
    ? 'veo-3.1-generate-001' 
    : 'veo-3.1-fast-generate-001';
  
  console.log(`Generating video clips with ${modelName}...`);
  
  const videoClips: VideoClip[] = [];
  let currentTimeMs = 0;

  // Process scenes with rate limiting (max 5 per minute for VEO)
  const DELAY_BETWEEN_REQUESTS = 12000; // 12 seconds = 5 requests per minute

  for (let i = 0; i < sceneImages.length; i++) {
    const scene = scenes[i];
    const sceneImage = sceneImages[i];
    
    console.log(`[Scene ${scene.sceneNumber}/${scenes.length}] Starting VEO video generation...`);

    try {
      // Add delay between requests to avoid rate limits (except first request)
      if (i > 0) {
        console.log(`Waiting ${DELAY_BETWEEN_REQUESTS/1000}s before next request...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
      }

      const { videoUrl, cost } = await generateSingleVideoClip(
        sceneImage.base64Data,
        scene,
        modelName,
        vertexToken,
        supabaseUrl,
        supabaseKey
      );
      
      const durationMs = scene.duration * 1000;
      const endTimeMs = currentTimeMs + durationMs;
      
      videoClips.push({
        sceneNumber: scene.sceneNumber,
        videoUrl,
        startTimeMs: currentTimeMs,
        endTimeMs: endTimeMs,
        cost,
        modelUsed: modelName
      });

      currentTimeMs = endTimeMs;
      console.log(`[Scene ${scene.sceneNumber}] Video generated successfully`);
      
    } catch (error: any) {
      console.error(`Failed to generate video for scene ${scene.sceneNumber}:`, error);
      throw new Error(`Scene ${scene.sceneNumber} video generation failed: ${error.message}`);
    }
  }

  return videoClips;
}

// Generate a single video clip using VEO 3.1 API
async function generateSingleVideoClip(
  imageBase64: string,
  scene: Scene,
  modelName: string,
  vertexToken: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<{ videoUrl: string; cost: number }> {
  const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
  
  // Calculate duration in seconds (VEO supports 4s, 6s, 8s)
  const duration = Math.min(8, Math.max(4, Math.round(scene.duration)));
  
  // Construct enhanced prompt with scene context
  const videoPrompt = `${scene.visualDescription}. ${scene.cameraMovement || 'Smooth, cinematic camera movement'}. Mood: ${scene.mood}. High quality, professional video production.`;

  console.log(`Calling VEO API: ${modelName}, duration: ${duration}s`);

  // Step 1: Start long-running operation
  const startResponse = await fetch(`${GEMINI_API_BASE}/models/${modelName}:predictLongRunning`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${vertexToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: videoPrompt },
          {
            inline_data: {
              mime_type: 'image/png',
              data: imageBase64
            }
          }
        ]
      }],
      generationConfig: {
        aspectRatio: '16:9',
        videoDuration: `${duration}s`,
        temperature: 1.0
      }
    })
  });

  if (!startResponse.ok) {
    const errorText = await startResponse.text();
    console.error('VEO API start failed:', errorText);
    throw new Error(`VEO API failed: ${startResponse.status} - ${errorText}`);
  }

  const operationData = await startResponse.json();
  const operationName = operationData.name;
  
  if (!operationName) {
    throw new Error('VEO API did not return operation name');
  }

  console.log(`VEO operation started: ${operationName}`);

  // Step 2: Poll for completion
  const videoFile = await pollVeoOperation(operationName, vertexToken);

  // Step 3: Download video and upload to Supabase Storage
  const videoUrl = await downloadAndStoreVideo(videoFile.uri, supabaseUrl, supabaseKey);

  // Calculate cost based on model and duration
  const cost = calculateVeoCost(modelName, duration);

  return { videoUrl, cost };
}

// Poll VEO operation until completion
async function pollVeoOperation(operationName: string, vertexToken: string): Promise<{ uri: string }> {
  const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
  const MAX_ATTEMPTS = 60; // 10 minutes max
  const POLL_INTERVAL = 10000; // 10 seconds

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));

    const pollResponse = await fetch(`${GEMINI_API_BASE}/${operationName}`, {
      headers: {
        'Authorization': `Bearer ${vertexToken}`,
      }
    });

    if (!pollResponse.ok) {
      console.error(`Poll attempt ${attempt} failed: ${pollResponse.status}`);
      continue;
    }

    const operation: VeoOperation = await pollResponse.json();

    if (operation.error) {
      throw new Error(`VEO operation failed: ${operation.error.message}`);
    }

    if (operation.done && operation.response?.generatedVideo?.uri) {
      console.log(`VEO operation completed after ${attempt * POLL_INTERVAL / 1000}s`);
      return { uri: operation.response.generatedVideo.uri };
    }

    console.log(`Poll attempt ${attempt}/${MAX_ATTEMPTS}: Operation in progress...`);
  }

  throw new Error('VEO operation timeout: Video generation took too long');
}

// Download video from Gemini file service and upload to Supabase Storage
async function downloadAndStoreVideo(
  fileUri: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<string> {
  console.log(`Downloading video from: ${fileUri}`);

  // Download video from Gemini file service
  const videoResponse = await fetch(fileUri);
  if (!videoResponse.ok) {
    throw new Error(`Failed to download video: ${videoResponse.status}`);
  }

  const videoBlob = await videoResponse.arrayBuffer();
  const fileName = `video-${Date.now()}-${Math.random().toString(36).substring(7)}.mp4`;

  // Upload to Supabase Storage
  const uploadResponse = await fetch(
    `${supabaseUrl}/storage/v1/object/video-clips/${fileName}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'video/mp4',
      },
      body: videoBlob
    }
  );

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Failed to upload video to storage: ${uploadResponse.status} - ${errorText}`);
  }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/video-clips/${fileName}`;
  console.log(`Video stored at: ${publicUrl}`);
  
  return publicUrl;
}

// Calculate VEO cost based on model and duration
function calculateVeoCost(modelName: string, durationSeconds: number): number {
  // VEO 3.1 pricing (approximate)
  const COST_PER_SECOND = modelName === 'veo-3.1-generate-001' ? 0.08 : 0.05;
  return durationSeconds * COST_PER_SECOND;
}
