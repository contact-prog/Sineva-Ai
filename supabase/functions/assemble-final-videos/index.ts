import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { assembleVideos } from "../_shared/video-assembler.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AssembleVideosRequest {
  videoGenerationId: string;
  platforms: string[];
  includeLogo: boolean;
  duration: number;
  style: string;
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

    const { videoGenerationId, platforms, includeLogo, duration, style }: AssembleVideosRequest = await req.json();

    console.log('Assembling final videos for:', videoGenerationId, 'platforms:', platforms);

    // Get video generation data
    const { data: videoGen, error: genError } = await supabaseClient
      .from('video_generations')
      .select('*')
      .eq('id', videoGenerationId)
      .single();

    if (genError) throw genError;

    // Get video clips
    const { data: scenes, error: scenesError } = await supabaseClient
      .from('video_story_scenes')
      .select('*')
      .eq('video_generation_id', videoGenerationId)
      .order('scene_number');

    if (scenesError) throw scenesError;

    // Get user logo if needed
    let logoUrl = null;
    if (includeLogo) {
      const { data: profile } = await supabaseClient
        .from('user_profiles')
        .select('logo_url')
        .eq('id', user.id)
        .single();
      
      logoUrl = profile?.logo_url || null;
    }

    // Update status to assembling
    await supabaseClient
      .from('video_generations')
      .update({ status: 'assembling' })
      .eq('id', videoGenerationId);

    // Prepare video clips and audio layers
    const videoClips = scenes.map((s, idx) => ({
      sceneNumber: s.scene_number,
      videoUrl: s.video_clip_url,
      startTimeMs: idx * s.duration_seconds * 1000,
      endTimeMs: (idx + 1) * s.duration_seconds * 1000,
      cost: s.generation_cost || 0,
      modelUsed: s.veo_model_used || 'veo-fast',
    }));

    const audioLayers = {
      voiceoverUrl: videoGen.voiceover_url,
      musicUrl: videoGen.music_url,
    };

    // Assemble videos for all platforms
    const finalVideos = await assembleVideos({
      videoClips,
      audioLayers,
      platforms,
      duration,
      logoUrl,
      style,
      supabaseUrl: Deno.env.get('SUPABASE_URL') ?? '',
      supabaseKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    });

    console.log(`Assembled ${finalVideos.length} final videos`);

    // Create platform URLs object
    const platformUrls: Record<string, string> = {};
    for (const video of finalVideos) {
      platformUrls[video.platform] = video.url;
    }

    // Update video generation with final videos
    await supabaseClient
      .from('video_generations')
      .update({ 
        status: 'completed',
        platform_urls: platformUrls,
        video_url: finalVideos[0]?.url || null, // Primary video
        thumbnail_url: finalVideos[0]?.thumbnailUrl || null,
        generation_time_seconds: Math.floor((new Date().getTime() - new Date(videoGen.created_at).getTime()) / 1000),
      })
      .eq('id', videoGenerationId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        finalVideos,
        platformUrls,
        message: `Successfully assembled ${finalVideos.length} videos` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error assembling videos:', error);

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
