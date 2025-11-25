import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { postId } = await req.json();
    
    console.log('Syncing WordPress analytics for post:', postId);

    // Get authorization header and user
    const authHeader = req.headers.get('authorization');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader || '' } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get the published post
    const { data: post, error: postError } = await supabaseClient
      .from('published_posts')
      .select('*, integrations!inner(*)')
      .eq('id', postId)
      .eq('user_id', user.id)
      .eq('platform', 'wordpress')
      .single();

    if (postError || !post) {
      throw new Error('Published post not found');
    }

    const integration = post.integrations;
    const siteUrl = integration.metadata?.site_url;
    
    if (!siteUrl) {
      throw new Error('Site URL not found');
    }

    // Fetch post from WordPress API
    const wpResponse = await fetch(
      `${siteUrl}/wp-json/wp/v2/posts/${post.external_id}?context=view`,
      {
        headers: {
          'Authorization': `Basic ${integration.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!wpResponse.ok) {
      console.error('Failed to fetch WordPress post:', wpResponse.status);
      throw new Error('Failed to fetch WordPress post data');
    }

    const wpPost = await wpResponse.json();
    
    // WordPress doesn't provide view counts by default, but we can get comments
    // Views would require a plugin like Jetpack Stats or similar
    const commentsCount = wpPost.comment_count || 0;
    
    // Fetch comments separately for more details if needed
    let commentsResponse;
    try {
      commentsResponse = await fetch(
        `${siteUrl}/wp-json/wp/v2/comments?post=${post.external_id}&per_page=1`,
        {
          headers: {
            'Authorization': `Basic ${integration.access_token}`,
          },
        }
      );
      
      if (commentsResponse.ok) {
        const totalComments = commentsResponse.headers.get('X-WP-Total');
        if (totalComments) {
          console.log('Total comments from header:', totalComments);
        }
      }
    } catch (commentsError) {
      console.warn('Could not fetch comments:', commentsError);
    }

    // Update published_posts with synced data
    const { error: updateError } = await supabaseClient
      .from('published_posts')
      .update({
        comments: commentsCount,
        last_synced_at: new Date().toISOString(),
        status: wpPost.status,
        sync_metadata: {
          title: wpPost.title?.rendered,
          excerpt: wpPost.excerpt?.rendered,
          modified: wpPost.modified,
          slug: wpPost.slug,
        }
      })
      .eq('id', postId);

    if (updateError) {
      console.error('Failed to update post analytics:', updateError);
      throw updateError;
    }

    console.log('Analytics synced successfully for post:', postId);

    return new Response(
      JSON.stringify({
        success: true,
        analytics: {
          comments: commentsCount,
          status: wpPost.status,
          link: wpPost.link,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error syncing WordPress analytics:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
