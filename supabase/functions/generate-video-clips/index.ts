import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { generateVideoClips } from "../_shared/video-clip-generator.ts";
import { generateVertexAuthToken, getVertexProjectId } from "../_shared/vertex-auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateClipsRequest {
  videoGenerationId: string;
  veoModel: 'veo-fast' | 'veo-premium' | 'veo-preview';
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

    const { videoGenerationId, veoModel }: GenerateClipsRequest = await req.json();

    console.log('Generating video clips for:', videoGenerationId, 'using model:', veoModel);

    // Get scenes with generated images
    const { data: scenes, error: scenesError } = await supabaseClient
      .from('video_story_scenes')
      .select('*')
      .eq('video_generation_id', videoGenerationId)
      .eq('status', 'image_approved')
      .order('scene_number');

    if (scenesError) throw scenesError;
    if (!scenes || scenes.length === 0) {
      throw new Error('No approved scene images found');
    }

    // Update status to generating_videos
    await supabaseClient
      .from('video_generations')
      .update({ 
        status: 'generating_videos',
        veo_model_used: veoModel,
      })
      .eq('id', videoGenerationId);

    // Get Vertex AI auth
    const vertexToken = await generateVertexAuthToken();

    // Generate video clips
    const videoClips = await generateVideoClips({
      scenes: scenes.map(s => ({
        sceneNumber: s.scene_number,
        duration: s.duration_seconds,
        visualDescription: s.visual_description,
        narration: s.narration || '',
        mood: s.mood,
        cameraMovement: s.camera_movement,
      })),
      sceneImages: scenes.map(s => ({
        sceneNumber: s.scene_number,
        imageUrl: s.image_url,
        base64Data: s.image_url,
      })),
      quality: veoModel === 'veo-premium' ? 'standard' : 'fast',
      vertexToken,
      supabaseUrl: Deno.env.get('SUPABASE_URL') ?? '',
      supabaseKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    });

    console.log(`Generated ${videoClips.length} video clips`);

    // Calculate total cost
    let totalCost = 0;
    for (const clip of videoClips) {
      totalCost += clip.cost;
    }

    // Update scenes with video URLs and costs
    for (const videoClip of videoClips) {
      const scene = scenes.find(s => s.scene_number === videoClip.sceneNumber);
      if (scene) {
        await supabaseClient
          .from('video_story_scenes')
          .update({ 
            video_clip_url: videoClip.videoUrl,
            status: 'video_generated',
            video_generated_at: new Date().toISOString(),
            veo_model_used: veoModel,
            generation_cost: videoClip.cost,
          })
          .eq('id', scene.id);
      }
    }

    // Update video generation status and cost
    await supabaseClient
      .from('video_generations')
      .update({ 
        status: 'videos_generated',
        cost_usd: totalCost,
        intermediate_clips_urls: videoClips.map(c => c.videoUrl),
        videos_approved_at: null, // Reset approval for user review
      })
      .eq('id', videoGenerationId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        videoClips,
        totalCost,
        message: `Successfully generated ${videoClips.length} video clips (Cost: $${totalCost.toFixed(2)})` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error generating video clips:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
