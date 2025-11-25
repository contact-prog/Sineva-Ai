import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Declare EdgeRuntime for TypeScript
declare const EdgeRuntime: {
  waitUntil(promise: Promise<any>): void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// JWT helper for service account authentication
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
  
  // Import the private key
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // Sign the JWT
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(unsignedJwt)
  );

  const signedJwt = `${unsignedJwt}.${btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')}`;

  // Exchange JWT for access token
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

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const requestBody = await req.json();
    const {
      prompt,
      negativePrompt,
      duration = 8,
      aspectRatio = "16:9",
      model = "veo-3.0-generate-preview",
      seed,
      image, // base64 data URL for image-to-video
      referenceImages, // array of base64 data URLs for reference images
      referenceType = "style", // "style" or "asset"
      startFrame, // base64 data URL for start frame
      endFrame, // base64 data URL for end frame
      mode = "text_to_video" // "text_to_video" | "frame_to_video" | "image_to_video"
    } = requestBody;

    console.log(`Starting video generation for user ${user.id}`);
    console.log(`Mode: ${mode}, Model: ${model}, Duration: ${duration}s, Aspect Ratio: ${aspectRatio}`);
    console.log(`Request body keys:`, Object.keys(requestBody));
    console.log(`StartFrame length: ${startFrame ? startFrame.length : 0}, EndFrame length: ${endFrame ? endFrame.length : 0}`);

    // Load service account credentials from environment
    const serviceAccountJson = Deno.env.get('VERTEX_AI_CREDENTIALS');
    if (!serviceAccountJson) {
      throw new Error('VERTEX_AI_CREDENTIALS environment variable not set');
    }
    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId = serviceAccount.project_id;
    const location = "us-central1";

    // Get access token
    console.log("Getting access token...");
    const accessToken = await getAccessToken(serviceAccount);

    // Build request payload
    const instance: any = { prompt };

    // Add start/end frames for frame-to-video mode
    if (mode === "frame_to_video") {
      console.log(`Frame-to-video mode detected. StartFrame exists: ${!!startFrame}, EndFrame exists: ${!!endFrame}`);
      
      if (startFrame && typeof startFrame === 'string' && startFrame.includes(',')) {
        const base64Data = startFrame.split(',')[1];
        const mimeType = startFrame.split(':')[1].split(';')[0];
        // Veo expects the FIRST frame as the primary image field on the instance
        instance.image = {
          bytesBase64Encoded: base64Data,
          mimeType: mimeType
        };
        console.log(`✅ Start frame attached to instance.image (${mimeType}, ${base64Data.length} bytes)`);
      } else {
        console.log(`⚠️ Start frame not in expected format or missing`);
      }
      
      if (endFrame && typeof endFrame === 'string' && endFrame.includes(',')) {
        const base64Data = endFrame.split(',')[1];
        const mimeType = endFrame.split(':')[1].split(';')[0];
        // Store temporarily - will be attached to parameters.endFrameImage
        (globalThis as any).__lastFrameTemp = { bytesBase64Encoded: base64Data, mimeType };
        console.log(`✅ End frame prepared for parameters.endFrameImage (${mimeType}, ${base64Data.length} bytes)`);
      } else {
        console.log(`ℹ️ No end frame provided (optional)`);
      }
    }

    // Add image for image-to-video (only if provided)
    if (image && typeof image === 'string' && image.includes(',')) {
      const base64Data = image.split(',')[1]; // Remove data:image/...;base64, prefix
      const mimeType = image.split(':')[1].split(';')[0];
      instance.image = {
        bytesBase64Encoded: base64Data,
        mimeType: mimeType
      };
      console.log("Using image-to-video mode");
    }

    // Add reference images (only if provided)
    if (referenceImages && Array.isArray(referenceImages) && referenceImages.length > 0) {
      instance.referenceImages = referenceImages.map((refImg: string) => {
        const base64Data = refImg.split(',')[1];
        const mimeType = refImg.split(':')[1].split(';')[0];
        return {
          image: {
            bytesBase64Encoded: base64Data,
            mimeType: mimeType
          },
          referenceType: referenceType
        };
      });
      console.log(`Using ${referenceImages.length} reference images (${referenceType})`);
    }

    const parameters: any = {
      durationSeconds: parseInt(duration),
      aspectRatio: aspectRatio,
      sampleCount: 1
    };

    // Attach end frame (if provided). Some API variants expect parameters.lastFrame.image, others parameters.endFrameImage.
    if ((globalThis as any).__lastFrameTemp) {
      const endFrameObj = (globalThis as any).__lastFrameTemp;
      // Primary: endFrameImage
      parameters.endFrameImage = endFrameObj;
      // Compatibility: lastFrame.image
      parameters.lastFrame = { image: endFrameObj };
      delete (globalThis as any).__lastFrameTemp;
      console.log(`✅ End frame attached to parameters.endFrameImage and parameters.lastFrame.image`);
    } else {
      console.log(`ℹ️ No end frame in parameters (using start frame only)`);
    }

    if (negativePrompt) {
      parameters.negativePrompt = negativePrompt;
    }

    if (seed) {
      parameters.seed = parseInt(seed);
    }

    const requestPayload = {
      instances: [instance],
      parameters: parameters
    };

    // Create database record with auto-generated title
    const title = prompt.length > 50 ? prompt.substring(0, 47) + '...' : prompt;
    const { data: videoRecord, error: dbError } = await supabase
      .from('videos')
      .insert({
        user_id: user.id,
        title: title,
        prompt: prompt,
        mode: mode,
        status: 'processing',
        progress: 0,
        duration_seconds: parseInt(duration),
        aspect_ratio: aspectRatio,
        model: model,
        negative_prompt: negativePrompt || null,
        start_frame_url: startFrame || null,
        end_frame_url: endFrame || null
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error(`Failed to create video record: ${dbError.message}`);
    }

    console.log(`Created video record: ${videoRecord.id}`);
    console.log(`📦 Payload summary: mode=${mode}, hasStartFrame=${!!instance.image}, hasEndFrame=${!!(parameters.endFrameImage || parameters.lastFrame)}, aspectRatio=${aspectRatio}, duration=${duration}s`);

    // Start video generation (long-running operation)
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:predictLongRunning`;
    
    console.log("Starting video generation...");
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
      console.error("Video generation failed:", generateResponse.status, errorText);
      
      await supabase.from('videos').update({
        status: 'failed',
        error_message: `API Error: ${generateResponse.status}`
      }).eq('id', videoRecord.id);

      throw new Error(`Video generation failed: ${errorText}`);
    }

    const generateResult = await generateResponse.json();
    const operationName = generateResult.name;
    
    console.log(`Operation started: ${operationName}`);

    // Store operation name for polling
    await supabase.from('videos').update({
      operation_name: operationName,
      progress: 10
    }).eq('id', videoRecord.id);

    // Start polling in background using waitUntil to keep function alive
    const pollingPromise = pollOperation(supabase, videoRecord.id, operationName, projectId, location, model, accessToken)
      .catch((error) => {
        console.error(`[Video ${videoRecord.id}] CRITICAL: Polling promise rejected:`, error);
        // Try one last update to mark as failed
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
        operationName: operationName,
        message: 'Video generation started. This may take 2-5 minutes.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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

// Polling function to check operation status
async function pollOperation(
  supabase: any,
  videoId: string,
  operationName: string,
  projectId: string,
  location: string,
  model: string,
  accessToken: string
) {
  console.log(`[Video ${videoId}] 🚀 pollOperation STARTED - operationName: ${operationName}`);
  
  try {
    console.log(`[Video ${videoId}] Starting polling for operation: ${operationName}`);
    
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
          const errorText = await pollResponse.text();
          console.error(`[Video ${videoId}] Poll attempt ${attempts} failed: ${pollResponse.status} - ${errorText}`);
          
          // If we get a persistent error after many attempts, mark as failed
          if (attempts > 5 && pollResponse.status >= 400 && pollResponse.status < 500) {
            await retryDbUpdate(supabase, videoId, {
              status: 'failed',
              error_message: `API error after ${attempts} attempts: ${pollResponse.status}`,
              progress: 0
            }, 5);
            return;
          }
          continue;
        }

        const pollResult = await pollResponse.json();
        done = pollResult.done;
        
        console.log(`[Video ${videoId}] 📊 Poll result: done=${done}, hasResponse=${!!pollResult.response}, hasVideos=${!!pollResult.response?.videos}`);

        // Update progress with retry
        const progress = Math.min(90, 10 + (attempts * 80 / maxAttempts));
        const progressUpdateSuccess = await retryDbUpdate(supabase, videoId, {
          progress: Math.floor(progress)
        }, 3);

        if (!progressUpdateSuccess) {
          console.error(`[Video ${videoId}] Failed to update progress after retries`);
        }

        console.log(`[Video ${videoId}] Poll attempt ${attempts}/${maxAttempts}: done=${done}, progress=${progress}%`);

        if (done && pollResult.response?.videos?.length > 0) {
          const video = pollResult.response.videos[0] || {};
          const gcsUri: string | undefined = video.gcsUri;
          const base64Bytes: string | undefined = video.bytesBase64Encoded;
          const mimeType: string = video.mimeType || 'video/mp4';

          console.log(`[Video ${videoId}] ✅ Video generation complete! GCS URI: ${!!gcsUri}, Base64: ${!!base64Bytes}`);

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
              throw new Error(`Storage upload failed: ${uploadError.message}`);
            }
            const { data: { publicUrl: url } } = supabase.storage
              .from('videos')
              .getPublicUrl(fileName);
            publicUrl = url;
          } else {
            console.log(`[Video ${videoId}] No video URL or bytes in response, marking as failed`);
            await retryDbUpdate(supabase, videoId, {
              status: 'failed',
              error_message: 'No video data returned from API',
              progress: 0
            }, 5);
            return;
          }

          // Update database with final URL
          console.log(`[Video ${videoId}] 💾 Attempting to save video URL and mark as completed...`);
          console.log(`[Video ${videoId}] Video URL: ${publicUrl}`);
          
          const finalUpdateSuccess = await retryDbUpdate(supabase, videoId, {
            video_url: publicUrl,
            status: 'completed',
            progress: 100,
            updated_at: new Date().toISOString()
          }, 8);

          if (!finalUpdateSuccess) {
            console.error(`[Video ${videoId}] ❌ CRITICAL: Failed to mark video as completed after all retries`);
          } else {
            console.log(`[Video ${videoId}] ✅ Successfully marked video as completed`);
            
            // Double-check the update
            const { data: verifyData, error: verifyError } = await supabase
              .from('videos')
              .select('status, video_url')
              .eq('id', videoId)
              .single();
            
            if (verifyError) {
              console.error(`[Video ${videoId}] ❌ Verification query failed:`, verifyError);
            } else if (verifyData?.status !== 'completed') {
              console.error(`[Video ${videoId}] ❌ CRITICAL: Status verification failed! Status is ${verifyData?.status}, expected 'completed'`);
            } else {
              console.log(`[Video ${videoId}] ✅✅ Verification passed - video is completed in DB`);
            }
          }
          return;
        }
      } catch (innerError) {
        console.error(`[Video ${videoId}] Error processing poll attempt ${attempts}:`, innerError);
        // Continue polling despite inner errors
      }
    }

    if (!done) {
      console.log(`[Video ${videoId}] ❌ Video generation timed out after ${attempts} attempts (5 minute limit)`);
      await retryDbUpdate(supabase, videoId, {
        status: 'failed',
        error_message: 'Generation timeout (5 min limit exceeded)',
        progress: 0
      }, 5);
    }
  } catch (error) {
    console.error(`[Video ${videoId}] Fatal error in pollOperation:`, error);
    await retryDbUpdate(supabase, videoId, {
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown polling error',
      progress: 0
    }, 5);
  }
}

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
    const videoResponse = await fetch(httpsUrl, {
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    });

    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status}`);
    }

    const videoBlob = await videoResponse.blob();
    const videoBuffer = await videoBlob.arrayBuffer();
    
    console.log(`Downloaded ${videoBuffer.byteLength} bytes`);

    // Upload to Supabase Storage
    const fileName = `${videoId}.mp4`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, videoBuffer, {
        contentType: 'video/mp4',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(fileName);

    console.log(`Video uploaded to: ${publicUrl}`);
    return publicUrl;

  } catch (error) {
    console.error("Download/upload error:", error);
    throw error;
  }
}
