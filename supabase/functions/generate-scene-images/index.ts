import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { generateSceneImages } from "../_shared/video-image-generator.ts";
import { generateVertexAuthToken, getVertexProjectId } from "../_shared/vertex-auth.ts";

// Declare EdgeRuntime global
declare const EdgeRuntime: {
  waitUntil(promise: Promise<any>): void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateImagesRequest {
  videoGenerationId: string;
  style?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with service role
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { videoGenerationId, style = 'cinematic' }: GenerateImagesRequest = await req.json();

    console.log('Generating images for video generation:', videoGenerationId);

    // Get scenes
    const { data: scenes, error: scenesError } = await supabaseClient
      .from('video_story_scenes')
      .select('*')
      .eq('video_generation_id', videoGenerationId)
      .order('scene_number');

    if (scenesError) throw scenesError;
    if (!scenes || scenes.length === 0) {
      throw new Error('No approved scenes found');
    }

    // Update status to generating_images
    await supabaseClient
      .from('video_generations')
      .update({ status: 'generating_images' })
      .eq('id', videoGenerationId);

    // Start background image generation task
    const backgroundTask = async () => {
      try {
        console.log('[Background] Starting image generation...');
        
        // Get Vertex AI auth
        const vertexToken = await generateVertexAuthToken();
        const projectId = getVertexProjectId();

        // Generate images with real-time updates
        const sceneImages = await generateSceneImages({
          scenes: scenes.map(s => ({
            sceneNumber: s.scene_number,
            duration: s.duration_seconds,
            visualDescription: s.visual_description,
            narration: s.narration,
            mood: s.mood,
          })),
          style,
          vertexToken,
          projectId,
          // Update database immediately after each scene completes
          onSceneComplete: async (sceneNumber, imageData) => {
            const scene = scenes.find(s => s.scene_number === sceneNumber);
            if (scene) {
              console.log(`[Background] Saving scene ${sceneNumber} image to database...`);
              await supabaseClient
                .from('video_story_scenes')
                .update({ 
                  image_url: imageData,
                })
                .eq('id', scene.id);
              console.log(`[Background] ✓ Scene ${sceneNumber} saved`);
            }
          }
        });

        console.log(`[Background] Generated ${sceneImages.length} images`);

        // Update video generation status
        await supabaseClient
          .from('video_generations')
          .update({ 
            status: 'images_generated',
            images_approved_at: null, // Reset approval for user review
          })
          .eq('id', videoGenerationId);

        console.log('[Background] Image generation completed successfully');
      } catch (error: any) {
        console.error('[Background] Image generation failed:', error);
        
        // Update status to failed
        await supabaseClient
          .from('video_generations')
          .update({ 
            status: 'failed',
            metadata: { error: error.message }
          })
          .eq('id', videoGenerationId);
      }
    };

    // Start background task
    EdgeRuntime.waitUntil(backgroundTask());

    // Return immediately
    return new Response(
      JSON.stringify({ 
        success: true, 
        status: 'generating_images',
        videoGenerationId,
        message: `Image generation started for ${scenes.length} scenes. Poll status for completion.` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error generating images:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
