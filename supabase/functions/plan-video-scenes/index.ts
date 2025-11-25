import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { planScenes } from "../_shared/video-scene-planner.ts";
import { generateVertexAuthToken, getVertexProjectId } from "../_shared/vertex-auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlanScenesRequest {
  storyInput: string;
  duration: number;
  style: string;
  numScenes?: number;
  includeVoiceover?: boolean;
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

    const { storyInput, duration, style, numScenes = 5, includeVoiceover = false }: PlanScenesRequest = await req.json();

    console.log('Planning scenes for new video generation', { includeVoiceover });

    // Create video generation record first
    const { data: videoGen, error: createError } = await supabaseClient
      .from('video_generations')
      .insert({
        user_id: user.id,
        prompt: storyInput,
        user_prompt: storyInput,
        duration_seconds: duration,
        style,
        status: 'scene_planning',
        generation_mode: 'story',
        is_automated: true,
      })
      .select()
      .single();

    if (createError) throw createError;
    const videoGenerationId = videoGen.id;

    console.log('Created video generation:', videoGenerationId);

    // Get Vertex AI auth
    const vertexToken = await generateVertexAuthToken();
    const projectId = getVertexProjectId();

    // Plan scenes
    const scenes = await planScenes({
      storyInput,
      duration,
      style,
      numScenes,
      vertexToken,
      projectId,
      includeVoiceover,
    });

    console.log(`Planned ${scenes.length} scenes`);

    // Insert scenes into database
    const sceneInserts = scenes.map(scene => ({
      video_generation_id: videoGenerationId,
      scene_number: scene.sceneNumber,
      duration_seconds: scene.duration,
      visual_description: scene.visualDescription,
      narration: scene.narration,
      mood: scene.mood,
    }));

    const { error: insertError } = await supabaseClient
      .from('video_story_scenes')
      .insert(sceneInserts);

    if (insertError) throw insertError;

    // Update video generation status
    await supabaseClient
      .from('video_generations')
      .update({ 
        status: 'scenes_planned',
        metadata: { scenesCount: scenes.length }
      })
      .eq('id', videoGenerationId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        videoGenerationId,
        scenes,
        message: `Successfully planned ${scenes.length} scenes` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error planning scenes:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
