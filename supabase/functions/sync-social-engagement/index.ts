import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EngagementStats {
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
  [key: string]: number | undefined;
}

Deno.serve(async (req) => {
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

    const { postId } = await req.json();
    console.log('Syncing engagement for post:', postId);

    // Get post details
    const { data: post, error: postError } = await supabase
      .from('social_posts')
      .select('*, social_accounts!inner(*)')
      .eq('id', postId)
      .eq('user_id', user.id)
      .single();

    if (postError || !post) {
      throw new Error('Post not found');
    }

    if (post.status !== 'published' && post.status !== 'partial') {
      throw new Error('Post must be published to sync engagement');
    }

    const platformPostIds = post.platform_post_ids as Record<string, string> || {};
    const aggregatedStats: EngagementStats = {
      likes: 0,
      comments: 0,
      shares: 0,
      views: 0
    };

    // Fetch engagement from each platform
    for (const [accountId, platformPostId] of Object.entries(platformPostIds)) {
      try {
        // Find the account
        const account = (post.social_accounts as any[]).find((a: any) => a.id === accountId);
        if (!account) continue;

        console.log(`Fetching engagement from ${account.platform} for post ${platformPostId}`);

        let stats: EngagementStats = {};

        switch (account.platform) {
          case 'facebook': {
            // Facebook Graph API
            const response = await fetch(
              `https://graph.facebook.com/v18.0/${platformPostId}?fields=likes.summary(true),comments.summary(true),shares&access_token=${account.access_token}`
            );
            const data = await response.json();
            
            if (data.error) {
              console.error('Facebook API error:', data.error);
              break;
            }

            stats = {
              likes: data.likes?.summary?.total_count || 0,
              comments: data.comments?.summary?.total_count || 0,
              shares: data.shares?.count || 0
            };
            break;
          }

          case 'instagram': {
            // Instagram Graph API
            const response = await fetch(
              `https://graph.facebook.com/v18.0/${platformPostId}?fields=like_count,comments_count&access_token=${account.access_token}`
            );
            const data = await response.json();
            
            if (data.error) {
              console.error('Instagram API error:', data.error);
              break;
            }

            stats = {
              likes: data.like_count || 0,
              comments: data.comments_count || 0
            };
            break;
          }

          case 'twitter': {
            // Twitter API v2
            const response = await fetch(
              `https://api.twitter.com/2/tweets/${platformPostId}?tweet.fields=public_metrics`,
              {
                headers: {
                  'Authorization': `Bearer ${account.access_token}`
                }
              }
            );
            const data = await response.json();
            
            if (data.errors) {
              console.error('Twitter API error:', data.errors);
              break;
            }

            const metrics = data.data?.public_metrics;
            stats = {
              likes: metrics?.like_count || 0,
              comments: metrics?.reply_count || 0,
              shares: metrics?.retweet_count || 0,
              views: metrics?.impression_count || 0
            };
            break;
          }

          case 'linkedin': {
            // LinkedIn API (simplified - actual implementation needs proper URN)
            console.log('LinkedIn engagement sync not yet fully implemented');
            // Would need to call LinkedIn's engagement API
            stats = {
              likes: 0,
              comments: 0,
              shares: 0
            };
            break;
          }
        }

        // Aggregate stats
        Object.keys(stats).forEach(key => {
          const value = stats[key] || 0;
          aggregatedStats[key] = (aggregatedStats[key] || 0) + value;
        });

      } catch (error: any) {
        console.error(`Failed to fetch engagement from ${accountId}:`, error);
      }
    }

    // Update post with aggregated stats
    const { error: updateError } = await supabase
      .from('social_posts')
      .update({
        engagement_stats: aggregatedStats
      })
      .eq('id', postId);

    if (updateError) {
      throw updateError;
    }

    console.log('Successfully synced engagement:', aggregatedStats);

    return new Response(
      JSON.stringify({ 
        success: true, 
        stats: aggregatedStats
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in sync-social-engagement:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error?.message || 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
