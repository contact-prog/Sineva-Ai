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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Processing scheduled posts...');

    // Get all scheduled posts that are due
    const now = new Date().toISOString();
    const { data: scheduledPosts, error: fetchError } = await supabase
      .from('social_posts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now);

    if (fetchError) {
      throw new Error(`Failed to fetch scheduled posts: ${fetchError.message}`);
    }

    if (!scheduledPosts || scheduledPosts.length === 0) {
      console.log('No scheduled posts due');
      return new Response(
        JSON.stringify({ processed: 0, message: 'No posts due' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${scheduledPosts.length} posts to process`);

    const results = [];

    for (const post of scheduledPosts) {
      try {
        // Update status to publishing
        await supabase
          .from('social_posts')
          .update({ status: 'publishing' })
          .eq('id', post.id);

        // Get user's social accounts
        const { data: accounts, error: accountsError } = await supabase
          .from('social_accounts')
          .select('*')
          .in('id', post.social_account_ids)
          .eq('user_id', post.user_id);

        if (accountsError || !accounts || accounts.length === 0) {
          throw new Error('No valid accounts found');
        }

        const platformResults: any[] = [];
        const platformPostIds: Record<string, string> = {};

        // Publish to each platform
        for (const account of accounts) {
          try {
            let functionName: string;
            switch (account.platform) {
              case 'facebook':
                functionName = 'post-to-facebook';
                break;
              case 'instagram':
                functionName = 'post-to-instagram';
                break;
              case 'twitter':
                functionName = 'post-to-twitter';
                break;
              case 'linkedin':
                functionName = 'post-to-linkedin';
                break;
              default:
                throw new Error(`Unsupported platform: ${account.platform}`);
            }

            const { data: platformResult, error: platformError } = await supabase.functions.invoke(
              functionName,
              {
                body: {
                  accountId: account.id,
                  content: post.content,
                  mediaUrls: post.media_urls || []
                }
              }
            );

            if (platformError) {
              throw platformError;
            }

            if (platformResult.success) {
              platformResults.push({
                platform: account.platform,
                success: true,
                platformPostId: platformResult.platformPostId
              });
              platformPostIds[account.id] = platformResult.platformPostId;
            } else {
              throw new Error(platformResult.error || 'Unknown error');
            }
          } catch (error: any) {
            console.error(`Failed to post to ${account.platform}:`, error);
            platformResults.push({
              platform: account.platform,
              success: false,
              error: error?.message || 'Unknown error'
            });
          }
        }

        // Update post status
        const allSuccessful = platformResults.every(r => r.success);
        const someSuccessful = platformResults.some(r => r.success);

        await supabase
          .from('social_posts')
          .update({
            status: allSuccessful ? 'published' : someSuccessful ? 'partial' : 'failed',
            published_at: someSuccessful ? new Date().toISOString() : null,
            platform_post_ids: platformPostIds
          })
          .eq('id', post.id);

        results.push({
          postId: post.id,
          success: someSuccessful,
          results: platformResults
        });

        console.log(`Processed post ${post.id}: ${allSuccessful ? 'success' : someSuccessful ? 'partial' : 'failed'}`);
      } catch (error: any) {
        console.error(`Error processing post ${post.id}:`, error);
        
        // Mark as failed
        await supabase
          .from('social_posts')
          .update({ status: 'failed' })
          .eq('id', post.id);

        results.push({
          postId: post.id,
          success: false,
          error: error?.message || 'Unknown error'
        });
      }
    }

    console.log('Processing complete');

    return new Response(
      JSON.stringify({
        processed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in process-scheduled-posts:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error?.message || 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
