import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { generateAudioLayers } from "../_shared/video-audio-generator.ts";
import { generateVertexAuthToken } from "../_shared/vertex-auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateAudioRequest {
  videoGenerationId: string;
  includeVoiceover: boolean;
  includeMusic: boolean;
  style: string;
  duration: number;
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

    const { videoGenerationId, includeVoiceover, includeMusic, style, duration }: GenerateAudioRequest = await req.json();

    console.log('Generating audio for video generation:', videoGenerationId);

    if (!includeVoiceover && !includeMusic) {
      // Skip audio generation if not needed
      await supabaseClient
        .from('video_generations')
        .update({ 
          status: 'audio_skipped',
          audio_generated_at: new Date().toISOString(),
        })
        .eq('id', videoGenerationId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Audio generation skipped' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get scenes for narration
    const { data: scenes, error: scenesError } = await supabaseClient
      .from('video_story_scenes')
      .select('*')
      .eq('video_generation_id', videoGenerationId)
      .order('scene_number');

    if (scenesError) throw scenesError;

    // Update status to generating_audio
    await supabaseClient
      .from('video_generations')
      .update({ status: 'generating_audio' })
      .eq('id', videoGenerationId);

    // Get Vertex AI auth
    const vertexToken = await generateVertexAuthToken();

    // Generate audio layers
    const audioLayers = await generateAudioLayers({
      scenes: scenes.map(s => ({
        sceneNumber: s.scene_number,
        duration: s.duration_seconds,
        visualDescription: s.visual_description,
        narration: s.narration,
        mood: s.mood,
      })),
      includeVoiceover,
      includeMusic,
      style,
      duration,
      vertexToken,
    });

    console.log('Audio generation complete');

    // Update video generation with audio URLs
    await supabaseClient
      .from('video_generations')
      .update({ 
        status: 'audio_generated',
        voiceover_url: audioLayers.voiceoverUrl || null,
        music_url: audioLayers.musicUrl || null,
        audio_generated_at: new Date().toISOString(),
      })
      .eq('id', videoGenerationId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        audioLayers,
        message: 'Audio generation complete' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error generating audio:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
