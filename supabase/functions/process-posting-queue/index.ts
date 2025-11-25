import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date().toISOString();
    console.log(`Processing posting queue at: ${now}`);

    // Fetch posts that are scheduled and due to be posted
    const { data: duePosts, error: fetchError } = await supabaseAdmin
      .from('posting_queue')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_for', now)
      .order('priority', { ascending: false }) // Process high priority first
      .limit(50); // Process max 50 posts per run

    if (fetchError) {
      console.error('Error fetching due posts:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${duePosts?.length || 0} posts to process`);

    if (!duePosts || duePosts.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          processed: 0, 
          message: 'No posts due for publishing' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      details: [] as any[]
    };

    // Process each post
    for (const post of duePosts) {
      results.processed++;
      console.log(`Processing post ${post.id} for platforms:`, post.platforms);

      try {
        // Update status to processing
        await supabaseAdmin
          .from('posting_queue')
          .update({ 
            status: 'processing',
            last_attempt_at: new Date().toISOString()
          })
          .eq('id', post.id);

        // Get social accounts for the integration_ids (which are now social_accounts IDs)
        const { data: socialAccounts, error: accountsError } = await supabaseAdmin
          .from('social_accounts')
          .select('*')
          .in('id', post.integration_ids)
          .eq('is_active', true);

        if (accountsError || !socialAccounts || socialAccounts.length === 0) {
          throw new Error('No valid social accounts found for post');
        }

        // Group social accounts by platform and process
        const platformResults: any[] = [];
        
        for (const socialAccount of socialAccounts) {
          const platform = socialAccount.platform;
          
          // Check if token is expired
          if (socialAccount.token_expires_at) {
            const expiryDate = new Date(socialAccount.token_expires_at);
            if (expiryDate < new Date()) {
              console.error(`Token expired for ${platform} account ${socialAccount.id}`);
              platformResults.push({
                platform,
                success: false,
                error: 'Access token expired. Please reconnect your account.'
              });
              continue;
            }
          }

          // Route to appropriate platform function
          let functionName: string;
          switch (platform) {
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
              console.warn(`Unsupported platform: ${platform}`);
              platformResults.push({
                platform,
                success: false,
                error: `Platform ${platform} not supported for auto-posting`
              });
              continue;
          }

          try {
            // Call platform-specific posting function using the social account
            console.log(`Calling ${functionName} for post ${post.id} with account ${socialAccount.id}`);
            
            const { data: postResult, error: postError } = await supabaseAdmin.functions.invoke(
              functionName,
              {
                body: {
                  accountId: socialAccount.id,
                  content: post.content,
                  mediaUrls: post.media_urls || []
                }
              }
            );

            if (postError) {
              throw postError;
            }

            platformResults.push({
              platform,
              success: true,
              platformPostId: postResult?.platformPostId || postResult?.postId
            });

            console.log(`Successfully posted to ${platform}`);
          } catch (platformError: any) {
            console.error(`Error posting to ${platform}:`, platformError);
            platformResults.push({
              platform,
              success: false,
              error: platformError.message || 'Unknown error'
            });
          }
        }

        // Check overall success
        const allSucceeded = platformResults.every(r => r.success);
        const anySucceeded = platformResults.some(r => r.success);

        if (allSucceeded) {
          // All platforms succeeded
          await supabaseAdmin
            .from('posting_queue')
            .update({
              status: 'published',
              published_at: new Date().toISOString(),
              platform_post_ids: platformResults.reduce((acc, r) => ({
                ...acc,
                [r.platform]: r.platformPostId
              }), {}),
              error_message: null
            })
            .eq('id', post.id);

          results.succeeded++;
          console.log(`Post ${post.id} published successfully to all platforms`);
        } else if (anySucceeded) {
          // Partial success
          const failedPlatforms = platformResults.filter(r => !r.success);
          await supabaseAdmin
            .from('posting_queue')
            .update({
              status: 'failed',
              error_message: `Failed on: ${failedPlatforms.map(f => `${f.platform} (${f.error})`).join(', ')}`,
              attempts: (post.attempts || 0) + 1
            })
            .eq('id', post.id);

          results.failed++;
          console.error(`Post ${post.id} partially failed:`, failedPlatforms);
        } else {
          // All failed - check if we should retry
          const newAttempts = (post.attempts || 0) + 1;
          const maxAttempts = post.max_attempts || 3;

          if (newAttempts < maxAttempts) {
            // Schedule retry with exponential backoff
            const retryDelay = Math.min(Math.pow(2, newAttempts) * 60 * 1000, 24 * 60 * 60 * 1000); // Max 24 hours
            const nextRetry = new Date(Date.now() + retryDelay).toISOString();

            await supabaseAdmin
              .from('posting_queue')
              .update({
                status: 'scheduled',
                attempts: newAttempts,
                next_retry_at: nextRetry,
                error_message: platformResults.map(r => `${r.platform}: ${r.error}`).join('; ')
              })
              .eq('id', post.id);

            console.log(`Post ${post.id} scheduled for retry at ${nextRetry}`);
          } else {
            // Max attempts reached
            await supabaseAdmin
              .from('posting_queue')
              .update({
                status: 'failed',
                attempts: newAttempts,
                error_message: `Max attempts (${maxAttempts}) reached. Errors: ${platformResults.map(r => `${r.platform}: ${r.error}`).join('; ')}`
              })
              .eq('id', post.id);

            results.failed++;
            console.error(`Post ${post.id} failed after ${maxAttempts} attempts`);
          }
        }

        results.details.push({
          postId: post.id,
          platforms: post.platforms,
          results: platformResults
        });

      } catch (error: any) {
        console.error(`Error processing post ${post.id}:`, error);
        
        // Update post with error
        const newAttempts = (post.attempts || 0) + 1;
        await supabaseAdmin
          .from('posting_queue')
          .update({
            status: newAttempts >= (post.max_attempts || 3) ? 'failed' : 'scheduled',
            attempts: newAttempts,
            error_message: error.message || 'Unknown error during processing'
          })
          .eq('id', post.id);

        results.failed++;
      }
    }

    console.log(`Processing complete:`, results);

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
        timestamp: now
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Fatal error in process-posting-queue:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
