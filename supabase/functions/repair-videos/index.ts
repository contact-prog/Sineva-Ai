import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid authentication',
          code: 'AUTH_INVALID'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Repairing videos for user: ${user.id}`);

    // Check if user has any videos at all
    const { data: allVideos, error: countError } = await supabaseClient
      .from('videos')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      console.error('Error checking videos:', countError);
      throw countError;
    }

    // Find stuck videos (processing status, created in last 24 hours)
    const { data: stuckVideos, error: fetchError } = await supabaseClient
      .from('videos')
      .select('id, video_url, title, prompt, thumbnail_url, duration_seconds, aspect_ratio, model')
      .eq('user_id', user.id)
      .eq('status', 'processing')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (fetchError) {
      console.error('Error fetching stuck videos:', fetchError);
      throw fetchError;
    }

    if (!stuckVideos || stuckVideos.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No stuck videos found', 
          repaired: 0,
          code: 'NO_STUCK_VIDEOS'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${stuckVideos.length} potentially stuck videos`);

    let repairedCount = 0;

    for (const video of stuckVideos) {
      try {
        // Check if video file exists in storage by trying to access it
        if (video.video_url) {
          const videoResponse = await fetch(video.video_url, { method: 'HEAD' });
          
          if (videoResponse.ok) {
            // Video exists! Mark as completed
            console.log(`Video ${video.id} exists in storage, marking as completed`);
            
            const { error: updateError } = await supabaseClient
              .from('videos')
              .update({
                status: 'completed',
                progress: 100,
                updated_at: new Date().toISOString()
              })
              .eq('id', video.id);

            if (updateError) {
              console.error(`Failed to update video ${video.id}:`, updateError);
            } else {
              repairedCount++;
              
              // Also ensure it's in brand_assets
              const { error: assetError } = await supabaseClient
                .from('brand_assets')
                .upsert({
                  user_id: user.id,
                  title: video.title || 'AI Generated Video',
                  image_url: video.video_url,
                  asset_type: 'video',
                  platform: 'video',
                  metadata: {
                    prompt: video.prompt,
                    thumbnail_url: video.thumbnail_url,
                    duration: video.duration_seconds,
                    aspectRatio: video.aspect_ratio,
                    model: video.model,
                    source: 'repair_function'
                  }
                }, {
                  onConflict: 'image_url,user_id'
                });

              if (assetError) {
                console.error(`Failed to upsert to brand_assets for video ${video.id}:`, assetError);
              }
            }
          }
        }
      } catch (err) {
        console.error(`Error checking video ${video.id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Repaired ${repairedCount} out of ${stuckVideos.length} videos`,
        repaired: repairedCount,
        total: stuckVideos.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in repair-videos:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
