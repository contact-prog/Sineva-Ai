import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PublishRequest {
  accountIds?: string[];
  platforms?: string[];
  content: string;
  mediaUrls?: string[];
  scheduledAt?: string;
  priority?: 'low' | 'medium' | 'high';
}

interface PlatformResult {
  platform: string;
  accountId: string;
  success: boolean;
  platformPostId?: string;
  error?: string;
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

    const { accountIds, platforms, content, mediaUrls = [], scheduledAt, priority = 'medium' }: PublishRequest = await req.json();
    console.log('Publishing to', accountIds?.length || 0, 'accounts, or platforms:', platforms || 'none');

    // If platforms array is provided, resolve to integration IDs for posting_queue
    let finalAccountIds = accountIds;
    let finalPlatforms = platforms;
    let integrationIds: string[] = [];

    if (platforms && platforms.length > 0) {
      // Get all active integrations for selected platforms
      const { data: integrations, error: integrationsError } = await supabase
        .from('integrations')
        .select('id, platform')
        .eq('user_id', user.id)
        .eq('connected', true)
        .in('platform', platforms);

      if (integrationsError) {
        console.error('Error fetching integrations:', integrationsError);
      }

      if (integrations && integrations.length > 0) {
        integrationIds = integrations.map(i => i.id);
        console.log('Resolved platforms to integration IDs:', integrationIds);
      } else {
        throw new Error(`No active integrations found for platforms: ${platforms.join(', ')}`);
      }
    }

    if (!content || content.trim().length === 0) {
      throw new Error('Post content is required');
    }

    // IF SCHEDULING: Use posting_queue table
    if (scheduledAt) {
      console.log('Creating scheduled post in posting_queue');

      if (!finalPlatforms || finalPlatforms.length === 0) {
        throw new Error('Platforms are required for scheduling');
      }

      if (integrationIds.length === 0) {
        throw new Error('No integrations found for selected platforms');
      }

      const { data: queueRecord, error: queueError } = await supabase
        .from('posting_queue')
        .insert({
          user_id: user.id,
          content: content,
          platforms: finalPlatforms,
          integration_ids: integrationIds,
          media_urls: mediaUrls,
          scheduled_for: scheduledAt,
          status: 'scheduled',
          priority: priority
        })
        .select()
        .single();

      if (queueError || !queueRecord) {
        console.error('Failed to create queue record:', queueError);
        throw new Error('Failed to schedule post');
      }

      console.log('Created queue record:', queueRecord.id);

      return new Response(
        JSON.stringify({
          success: true,
          postId: queueRecord.id,
          status: 'scheduled',
          scheduledFor: scheduledAt
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // IMMEDIATE PUBLISHING: Use social_posts table and legacy account IDs
    if (!finalAccountIds || finalAccountIds.length === 0) {
      // Try to resolve from platforms if no accountIds
      const { data: accounts, error: accountsError } = await supabase
        .from('social_accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .in('platform', platforms || []);

      if (accountsError || !accounts || accounts.length === 0) {
        throw new Error(`No active accounts found`);
      }

      finalAccountIds = accounts.map(a => a.id);
      console.log('Resolved to account IDs:', finalAccountIds);
    }

    if (!finalAccountIds || finalAccountIds.length === 0) {
      throw new Error('No accounts selected');
    }

    // Get all selected accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('social_accounts')
      .select('*')
      .in('id', finalAccountIds)
      .eq('user_id', user.id);

    if (accountsError || !accounts || accounts.length === 0) {
      throw new Error('No valid accounts found');
    }

    // Create post record with draft status
    const { data: postRecord, error: postError } = await supabase
      .from('social_posts')
      .insert({
        user_id: user.id,
        social_account_ids: finalAccountIds,
        content: content,
        media_urls: mediaUrls,
        status: scheduledAt ? 'scheduled' : 'publishing',
        scheduled_at: scheduledAt || null
      })
      .select()
      .single();

    if (postError || !postRecord) {
      throw new Error('Failed to create post record');
    }

    console.log('Created post record:', postRecord.id);

    // Publish to each platform
    const results: PlatformResult[] = [];
    const platformPostIds: Record<string, string> = {};

    for (const account of accounts) {
      try {
        console.log(`Publishing to ${account.platform} account ${account.account_name}`);

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
              content,
              mediaUrls
            }
          }
        );

        if (platformError) {
          throw platformError;
        }

        if (platformResult.success) {
          results.push({
            platform: account.platform,
            accountId: account.id,
            success: true,
            platformPostId: platformResult.platformPostId
          });

          platformPostIds[account.id] = platformResult.platformPostId;
          console.log(`Successfully posted to ${account.platform}: ${platformResult.platformPostId}`);
        } else {
          throw new Error(platformResult.error || 'Unknown error');
        }

      } catch (error: any) {
        console.error(`Failed to post to ${account.platform}:`, error);
        results.push({
          platform: account.platform,
          accountId: account.id,
          success: false,
          error: error?.message || 'Unknown error'
        });
      }
    }

    // Update post record with results
    const allSuccessful = results.every(r => r.success);
    const someSuccessful = results.some(r => r.success);

    const { error: updateError } = await supabase
      .from('social_posts')
      .update({
        status: allSuccessful ? 'published' : someSuccessful ? 'partial' : 'failed',
        published_at: someSuccessful ? new Date().toISOString() : null,
        platform_post_ids: platformPostIds
      })
      .eq('id', postRecord.id);

    if (updateError) {
      console.error('Failed to update post record:', updateError);
    }

    console.log('Publishing complete. Results:', results);

    return new Response(
      JSON.stringify({
        success: someSuccessful,
        postId: postRecord.id,
        results,
        summary: {
          total: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        }
      }),
      { 
        status: allSuccessful ? 200 : 207, // 207 Multi-Status for partial success
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in publish-social-post:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error?.message || 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
