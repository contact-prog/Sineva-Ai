import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QueueJob {
  id: string;
  user_id: string;
  integration_ids: string[];
  platforms: string[];
  content: string;
  media_urls: string[];
  scheduled_for: string;
  status: string;
  attempts: number;
  max_attempts: number;
  metadata: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🤖 Posting worker started');

    // Fetch jobs that are due
    const now = new Date().toISOString();
    const { data: jobs, error: fetchError } = await supabase
      .from('posting_queue')
      .select('*')
      .in('status', ['pending', 'scheduled'])
      .lte('scheduled_for', now)
      .order('priority', { ascending: false })
      .order('scheduled_for', { ascending: true })
      .limit(10);

    if (fetchError) {
      throw new Error(`Failed to fetch jobs: ${fetchError.message}`);
    }

    if (!jobs || jobs.length === 0) {
      console.log('✅ No jobs to process');
      return new Response(
        JSON.stringify({ message: 'No jobs to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found ${jobs.length} jobs to process`);
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    for (const job of jobs as any[]) {
      try {
        // Mark as processing
        await supabase
          .from('posting_queue')
          .update({ 
            status: 'processing', 
            last_attempt_at: new Date().toISOString(),
            attempts: job.attempts + 1 
          })
          .eq('id', job.id);

        // Process each integration
        const results = [];
        for (let i = 0; i < job.integration_ids.length; i++) {
          const integrationId = job.integration_ids[i];
          const platform = job.platforms[i];

          try {
            // Fetch integration
            const { data: integration, error: intError } = await supabase
              .from('integrations')
              .select('*')
              .eq('id', integrationId)
              .single();

            if (intError || !integration) {
              throw new Error(`Integration not found: ${integrationId}`);
            }

            // Check token expiry
            if (integration.expires_at && new Date(integration.expires_at) < new Date()) {
              throw new Error('Access token expired');
            }

            // Get platform-specific metadata from job
            const platformMetadata = job.metadata?.[integrationId] || {};

            // Post to platform
            const result = await postToPlatform(
              platform,
              job.content,
              job.media_urls,
              integration,
              platformMetadata
            );

            results.push(result);
          } catch (error) {
            results.push({
              platform,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              postId: undefined
            });
          }
        }

        // Check if all succeeded
        const allSucceeded = results.every(r => r.success);
        const anySucceeded = results.some(r => r.success);

        if (allSucceeded) {
          const platformPostIds: Record<string, string> = {};
          results.forEach(r => {
            if (r.success && r.postId) {
              platformPostIds[r.platform] = r.postId;
            }
          });

          await supabase
            .from('posting_queue')
            .update({
              status: 'published',
              published_at: new Date().toISOString(),
              platform_post_ids: platformPostIds,
            })
            .eq('id', job.id);

          console.log(`✅ Job ${job.id} completed successfully`);
          succeeded++;
        } else if (anySucceeded) {
          const platformPostIds: Record<string, string> = {};
          results.forEach(r => {
            if (r.success && r.postId) {
              platformPostIds[r.platform] = r.postId;
            }
          });

          await supabase
            .from('posting_queue')
            .update({
              status: 'failed',
              error_message: 'Partial failure: ' + results.filter(r => !r.success).map(r => r.error).join(', '),
              platform_post_ids: platformPostIds,
            })
            .eq('id', job.id);
          failed++;
        } else {
          throw new Error(results[0]?.error || 'All platforms failed');
        }

        processed++;
      } catch (error) {
        console.error(`❌ Job ${job.id} failed:`, error);
        
        const attempts = (job.attempts || 0) + 1;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (attempts >= (job.max_attempts || 3)) {
          await supabase
            .from('posting_queue')
            .update({
              status: 'failed',
              attempts,
              error_message: errorMessage,
            })
            .eq('id', job.id);
          
          failed++;
        } else {
          const backoffMinutes = Math.pow(2, attempts) * 5;
          const nextAttempt = new Date(Date.now() + backoffMinutes * 60 * 1000);

          await supabase
            .from('posting_queue')
            .update({
              status: 'scheduled',
              attempts,
              scheduled_for: nextAttempt.toISOString(),
              error_message: errorMessage,
              next_retry_at: nextAttempt.toISOString(),
            })
            .eq('id', job.id);

          console.log(`🔄 Job ${job.id} scheduled for retry in ${backoffMinutes} minutes`);
        }
      }
    }

    console.log(`✅ Worker completed: ${succeeded} succeeded, ${failed} failed, ${processed} total`);

    return new Response(
      JSON.stringify({
        message: 'Worker completed',
        processed,
        succeeded,
        failed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Worker error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function postToPlatform(
  platform: string,
  content: string,
  mediaUrls: string[],
  integration: any,
  metadata: any
): Promise<{ success: boolean; postId?: string; platform: string; error?: string }> {
  const platformLower = platform.toLowerCase();

  try {
    if (platformLower === 'facebook') {
      return await postToFacebook(content, mediaUrls, integration, metadata);
    } else if (platformLower === 'instagram') {
      return await postToInstagram(content, mediaUrls, integration, metadata);
    } else if (platformLower === 'linkedin') {
      return await postToLinkedIn(content, mediaUrls, integration);
    } else if (platformLower === 'twitter' || platformLower === 'x') {
      return await postToTwitter(content, mediaUrls, integration);
    } else {
      return { success: false, platform, error: `Unsupported platform: ${platform}` };
    }
  } catch (error) {
    return {
      success: false,
      platform,
      error: error instanceof Error ? error.message : 'Posting failed',
    };
  }
}

async function postToFacebook(
  content: string,
  mediaUrls: string[],
  integration: any,
  metadata: any
): Promise<{ success: boolean; postId?: string; platform: string; error?: string }> {
  try {
    const pageId = metadata.page_id || integration.metadata?.page_id;
    const pageAccessToken = metadata.page_access_token || integration.metadata?.page_access_token;

    if (!pageId || !pageAccessToken) {
      throw new Error('Facebook Page credentials missing');
    }

    const postData: any = {
      message: content,
      access_token: pageAccessToken,
    };

    if (mediaUrls.length > 0) {
      postData.link = mediaUrls[0];
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/feed`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || response.statusText);
    }

    const result = await response.json();
    return { success: true, postId: result.id, platform: 'facebook' };
  } catch (error) {
    return {
      success: false,
      platform: 'facebook',
      error: error instanceof Error ? error.message : 'Facebook posting failed',
    };
  }
}

async function postToInstagram(
  content: string,
  mediaUrls: string[],
  integration: any,
  metadata: any
): Promise<{ success: boolean; postId?: string; platform: string; error?: string }> {
  try {
    const igAccountId = metadata.account_id || integration.metadata?.account_id;
    const pageAccessToken = metadata.page_access_token || integration.metadata?.page_access_token;

    if (!igAccountId || !pageAccessToken) {
      throw new Error('Instagram credentials missing');
    }

    if (!mediaUrls || mediaUrls.length === 0) {
      throw new Error('Instagram requires media');
    }

    const mediaUrl = mediaUrls[0];
    const isVideo = /\.(mp4|mov|avi)$/i.test(mediaUrl);

    // Create container
    const containerData: any = {
      caption: content,
      access_token: pageAccessToken,
    };

    if (isVideo) {
      containerData.media_type = 'VIDEO';
      containerData.video_url = mediaUrl;
    } else {
      containerData.image_url = mediaUrl;
    }

    const containerResponse = await fetch(
      `https://graph.facebook.com/v18.0/${igAccountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(containerData),
      }
    );

    if (!containerResponse.ok) {
      const error = await containerResponse.json();
      throw new Error(error.error?.message || containerResponse.statusText);
    }

    const containerResult = await containerResponse.json();
    const containerId = containerResult.id;

    // Wait for video processing if needed
    if (isVideo) {
      let attempts = 0;
      let status = 'IN_PROGRESS';

      while (status === 'IN_PROGRESS' && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 2000));

        const statusResponse = await fetch(
          `https://graph.facebook.com/v18.0/${containerId}?fields=status_code&access_token=${pageAccessToken}`
        );

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          status = statusData.status_code || 'FINISHED';
        }

        attempts++;
      }

      if (status !== 'FINISHED') {
        throw new Error(`Video processing timeout: ${status}`);
      }
    }

    // Publish
    const publishResponse = await fetch(
      `https://graph.facebook.com/v18.0/${igAccountId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: pageAccessToken,
        }),
      }
    );

    if (!publishResponse.ok) {
      const error = await publishResponse.json();
      throw new Error(error.error?.message || publishResponse.statusText);
    }

    const result = await publishResponse.json();
    return { success: true, postId: result.id, platform: 'instagram' };
  } catch (error) {
    return {
      success: false,
      platform: 'instagram',
      error: error instanceof Error ? error.message : 'Instagram posting failed',
    };
  }
}

async function postToLinkedIn(
  content: string,
  mediaUrls: string[],
  integration: any
): Promise<{ success: boolean; postId?: string; platform: string; error?: string }> {
  try {
    const userIdResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${integration.access_token}` },
    });

    if (!userIdResponse.ok) throw new Error('Failed to get LinkedIn user ID');
    const userData = await userIdResponse.json();
    const linkedInUserId = userData.sub;

    const postData: any = {
      author: `urn:li:person:${linkedInUserId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: content },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${integration.access_token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(postData),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const result = await response.json();
    return { success: true, postId: result.id, platform: 'linkedin' };
  } catch (error) {
    return {
      success: false,
      platform: 'linkedin',
      error: error instanceof Error ? error.message : 'LinkedIn posting failed',
    };
  }
}

async function postToTwitter(
  content: string,
  mediaUrls: string[],
  integration: any
): Promise<{ success: boolean; postId?: string; platform: string; error?: string }> {
  try {
    const tweetData: any = { text: content };

    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${integration.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tweetData),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const result = await response.json();
    return { success: true, postId: result.data.id, platform: 'twitter' };
  } catch (error) {
    return {
      success: false,
      platform: 'twitter',
      error: error instanceof Error ? error.message : 'Twitter posting failed',
    };
  }
}
