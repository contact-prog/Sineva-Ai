import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PostRequest {
  accountId: string;
  content: string;
  mediaUrls?: string[];
  articleUrl?: string;
  articleTitle?: string; // For article posts
  articleDescription?: string; // For article posts
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

    const { accountId, content, mediaUrls = [], articleUrl, articleTitle, articleDescription }: PostRequest = await req.json();
    console.log('Posting to LinkedIn for account:', accountId);

    // Get account details
    const { data: account, error: accountError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      throw new Error('Account not found');
    }

    if (account.platform !== 'linkedin') {
      throw new Error('Invalid platform for this endpoint');
    }

    // Check if token is expired
    if (account.token_expires_at && new Date(account.token_expires_at) < new Date()) {
      throw new Error('Access token expired. Please reconnect your account.');
    }

    // Get user profile URN
    const profileData = account.metadata as any;
    const authorUrn = `urn:li:person:${profileData.profile?.sub || account.account_id}`;

    // Prepare post data
    const postData: any = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: content
          },
          shareMediaCategory: mediaUrls.length > 0 ? 'IMAGE' : 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };

    // Handle article/link sharing with enhanced metadata
    if (articleUrl) {
      postData.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'ARTICLE';
      postData.specificContent['com.linkedin.ugc.ShareContent'].media = [{
        status: 'READY',
        originalUrl: articleUrl,
        title: {
          text: articleTitle || 'Article'
        },
        description: {
          text: articleDescription || content.substring(0, 200)
        }
      }];
    } else if (mediaUrls.length > 0) {
      // Handle media (simplified - full implementation requires LinkedIn media upload API)
      postData.specificContent['com.linkedin.ugc.ShareContent'].media = mediaUrls.map(url => ({
        status: 'READY',
        media: url
      }));
    }

    // Post to LinkedIn
    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.access_token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(postData)
    });

    const responseText = await response.text();
    let result;
    
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { text: responseText };
    }

    if (!response.ok) {
      const errorMessage = result.message || result.error || 'Failed to post to LinkedIn';
      throw new Error(errorMessage);
    }

    // LinkedIn returns the post ID in the response headers or body
    const platformPostId = result.id || response.headers.get('x-linkedin-id') || 'unknown';
    console.log('Successfully posted to LinkedIn:', platformPostId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        platformPostId,
        platform: 'linkedin'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in post-to-linkedin:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error?.message || 'Unknown error',
        platform: 'linkedin'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
