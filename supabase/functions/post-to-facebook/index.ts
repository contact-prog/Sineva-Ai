import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PostRequest {
  accountId: string;
  content: string;
  mediaUrls?: string[];
  scheduledTime?: string;
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

    const { accountId, content, mediaUrls = [] }: PostRequest = await req.json();
    console.log('Posting to Facebook for account:', accountId);

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

    if (account.platform !== 'facebook') {
      throw new Error('Invalid platform for this endpoint');
    }

    // Check if token is expired
    if (account.token_expires_at && new Date(account.token_expires_at) < new Date()) {
      throw new Error('Access token expired. Please reconnect your account.');
    }

    // Prepare post data
    const postData: any = {
      message: content,
      access_token: account.access_token
    };

    let postUrl = `https://graph.facebook.com/v18.0/${account.account_id}/feed`;
    let platformPostId: string;

    // Handle media uploads
    if (mediaUrls.length > 0) {
      if (mediaUrls.length === 1) {
        // Single photo/video
        const mediaUrl = mediaUrls[0];
        const isVideo = mediaUrl.match(/\.(mp4|mov|avi)$/i);

        if (isVideo) {
          // Video post
          postUrl = `https://graph.facebook.com/v18.0/${account.account_id}/videos`;
          postData.file_url = mediaUrl;
          postData.description = content;
          delete postData.message;
        } else {
          // Photo post
          postUrl = `https://graph.facebook.com/v18.0/${account.account_id}/photos`;
          postData.url = mediaUrl;
          postData.caption = content;
          delete postData.message;
        }
      } else {
        // Multiple photos - create album
        throw new Error('Multiple media posting not yet implemented for Facebook');
      }
    }

    // Post to Facebook
    const response = await fetch(postUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(postData)
    });

    const result = await response.json();

    if (!response.ok || result.error) {
      throw new Error(result.error?.message || 'Failed to post to Facebook');
    }

    platformPostId = result.id || result.post_id;
    console.log('Successfully posted to Facebook:', platformPostId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        platformPostId,
        platform: 'facebook'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in post-to-facebook:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error?.message || 'Unknown error',
        platform: 'facebook'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
