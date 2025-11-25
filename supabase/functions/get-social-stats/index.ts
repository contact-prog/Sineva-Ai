import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

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

    const { platform = 'all', limit = 10 } = await req.json();
    console.log('Fetching stats for platform:', platform, 'limit:', limit);

    // Build query
    let query = supabase
      .from('social_posts')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(limit);

    const { data: posts, error: postsError } = await query;

    if (postsError) throw postsError;

    if (!posts || posts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          stats: {
            totalPosts: 0,
            totalLikes: 0,
            totalComments: 0,
            totalShares: 0,
            totalReach: 0,
            averageEngagement: 0
          },
          posts: [],
          message: 'No published posts found'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate aggregate stats
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let totalReach = 0;

    const postsWithStats = posts.map(post => {
      const engagement = post.engagement_stats as any || {};
      const likes = engagement.likes || 0;
      const comments = engagement.comments || 0;
      const shares = engagement.shares || 0;
      const reach = engagement.views || engagement.reach || 0;

      totalLikes += likes;
      totalComments += comments;
      totalShares += shares;
      totalReach += reach;

      return {
        id: post.id,
        content: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : ''),
        publishedAt: post.published_at,
        platforms: Object.keys(post.platform_post_ids as any || {}),
        engagement: {
          likes,
          comments,
          shares,
          reach,
          total: likes + comments + shares
        }
      };
    });

    // Sort by total engagement
    postsWithStats.sort((a, b) => b.engagement.total - a.engagement.total);

    const averageEngagement = posts.length > 0 
      ? (totalLikes + totalComments + totalShares) / posts.length 
      : 0;

    console.log('Calculated stats for', posts.length, 'posts');

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          totalPosts: posts.length,
          totalLikes,
          totalComments,
          totalShares,
          totalReach,
          averageEngagement: Math.round(averageEngagement)
        },
        topPosts: postsWithStats.slice(0, 5),
        recentPosts: postsWithStats
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in get-social-stats:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error?.message || 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
