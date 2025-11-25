import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PostRequest {
  accountId: string;
  content: string;
  mediaUrls?: string[];
  isThread?: boolean;
  threadTweets?: string[]; // For thread support
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

    const { accountId, content, mediaUrls = [], isThread, threadTweets = [] }: PostRequest = await req.json();
    console.log('Posting to Twitter for account:', accountId);

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

    if (account.platform !== 'twitter') {
      throw new Error('Invalid platform for this endpoint');
    }

    // Check if token is expired
    if (account.token_expires_at && new Date(account.token_expires_at) < new Date()) {
      throw new Error('Access token expired. Please reconnect your account.');
    }

    // Handle thread posting
    if (isThread && threadTweets.length > 0) {
      console.log(`Posting Twitter thread with ${threadTweets.length} tweets`);
      
      let previousTweetId: string | null = null;
      const threadIds: string[] = [];

      for (let i = 0; i < threadTweets.length; i++) {
        const tweetPayload: any = {
          text: threadTweets[i]
        };

        if (previousTweetId) {
          tweetPayload.reply = {
            in_reply_to_tweet_id: previousTweetId
          };
        }

        const twitterResponse = await fetch('https://api.twitter.com/2/tweets', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${account.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(tweetPayload)
        });

        const result = await twitterResponse.json();

        if (!twitterResponse.ok || result.errors) {
          const errorMessage = result.errors?.[0]?.message || result.detail || `Failed on tweet ${i + 1}`;
          throw new Error(errorMessage);
        }

        const tweetId = result.data.id;
        previousTweetId = tweetId;
        threadIds.push(tweetId);
        
        console.log(`Thread tweet ${i + 1} posted: ${tweetId}`);
      }

      const platformPostId = threadIds[0];
      console.log('Successfully posted Twitter thread:', platformPostId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          platformPostId,
          threadIds,
          platform: 'twitter',
          tweetUrl: `https://twitter.com/i/web/status/${platformPostId}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare single tweet data
    const tweetData: any = {
      text: content
    };

    // Handle media uploads
    if (mediaUrls.length > 0) {
      // Twitter requires uploading media first to get media IDs
      // For simplicity, we'll assume media is already uploaded to Twitter
      // In production, implement Twitter media upload API
      console.log('Media posting to Twitter requires pre-upload. URLs provided:', mediaUrls);
      // tweetData.media = { media_ids: [mediaIds] };
    }

    // Post to Twitter
    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tweetData)
    });

    const result = await response.json();

    if (!response.ok || result.errors) {
      const errorMessage = result.errors?.[0]?.message || result.detail || 'Failed to post to Twitter';
      throw new Error(errorMessage);
    }

    const platformPostId = result.data.id;
    console.log('Successfully posted to Twitter:', platformPostId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        platformPostId,
        platform: 'twitter',
        tweetUrl: `https://twitter.com/i/web/status/${platformPostId}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in post-to-twitter:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error?.message || 'Unknown error',
        platform: 'twitter'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
