import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { videoId } = await req.json();

    if (!videoId) {
      throw new Error('videoId is required');
    }

    console.log(`Checking status for video: ${videoId}`);

    // Fetch video generation status
    const { data: videoGen, error: fetchError } = await supabase
      .from('video_generations')
      .select('id, status, video_url, thumbnail_url, cost_usd, generation_time_seconds, veo_model_used, metadata, created_at, updated_at')
      .eq('id', videoId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !videoGen) {
      throw new Error('Video generation not found');
    }

    // Check if generation is stuck (more than 10 minutes in generating state)
    const createdAt = new Date(videoGen.created_at);
    const now = new Date();
    const elapsedMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
    
    const isStuck = videoGen.status === 'generating' && elapsedMinutes > 10;

    if (isStuck) {
      console.warn(`Video ${videoId} appears stuck. Marking as failed.`);
      
      await supabase
        .from('video_generations')
        .update({
          status: 'failed',
          metadata: {
            ...videoGen.metadata,
            error: 'Generation timeout - exceeded 10 minutes',
            errorType: 'timeout_error',
            stuckDetectedAt: now.toISOString()
          }
        })
        .eq('id', videoId);

      return new Response(
        JSON.stringify({
          status: 'failed',
          error: 'Video generation timed out. Please try again.',
          errorType: 'timeout'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return current status
    return new Response(
      JSON.stringify({
        status: videoGen.status,
        videoId: videoGen.id,
        videoUrl: videoGen.video_url,
        thumbnailUrl: videoGen.thumbnail_url,
        cost: videoGen.cost_usd,
        generationTime: videoGen.generation_time_seconds,
        modelUsed: videoGen.veo_model_used,
        metadata: videoGen.metadata,
        elapsedSeconds: Math.floor(elapsedMinutes * 60)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error checking video status:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
