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

    const { accountId } = await req.json();
    console.log('Refreshing token for account:', accountId);

    // Get the account details
    const { data: account, error: accountError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      throw new Error('Account not found');
    }

    if (!account.refresh_token) {
      throw new Error('No refresh token available for this account');
    }

    let tokenData: any;

    switch (account.platform) {
      case 'twitter': {
        const clientId = Deno.env.get('TWITTER_API_KEY');
        const clientSecret = Deno.env.get('TWITTER_API_SECRET');
        
        const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`
          },
          body: new URLSearchParams({
            refresh_token: account.refresh_token,
            grant_type: 'refresh_token'
          }).toString()
        });
        
        tokenData = await tokenResponse.json();
        
        if (tokenData.error) {
          throw new Error(`Twitter token refresh error: ${tokenData.error_description}`);
        }

        break;
      }

      case 'linkedin': {
        const clientId = Deno.env.get('LINKEDIN_CLIENT_ID');
        const clientSecret = Deno.env.get('LINKEDIN_CLIENT_SECRET');
        
        if (!clientId || !clientSecret) {
          throw new Error('LinkedIn credentials not configured');
        }
        
        const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: account.refresh_token,
            client_id: clientId,
            client_secret: clientSecret
          }).toString()
        });
        
        tokenData = await tokenResponse.json();
        
        if (tokenData.error) {
          throw new Error(`LinkedIn token refresh error: ${tokenData.error_description}`);
        }

        break;
      }

      case 'facebook':
      case 'instagram': {
        // Facebook tokens are long-lived (60 days) and don't need refresh
        // If needed, exchange for a new long-lived token
        const clientId = Deno.env.get('FACEBOOK_APP_ID');
        const clientSecret = Deno.env.get('FACEBOOK_APP_SECRET');
        
        const tokenResponse = await fetch(
          `https://graph.facebook.com/v18.0/oauth/access_token?` +
          `grant_type=fb_exchange_token` +
          `&client_id=${clientId}` +
          `&client_secret=${clientSecret}` +
          `&fb_exchange_token=${account.access_token}`
        );
        
        tokenData = await tokenResponse.json();
        
        if (tokenData.error) {
          throw new Error(`Facebook token refresh error: ${tokenData.error.message}`);
        }

        break;
      }

      default:
        throw new Error(`Token refresh not supported for platform: ${account.platform}`);
    }

    // Update the database with new tokens
    const { error: updateError } = await supabase
      .from('social_accounts')
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || account.refresh_token,
        token_expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId);

    if (updateError) {
      throw updateError;
    }

    console.log('Successfully refreshed token for', account.platform);

    return new Response(
      JSON.stringify({ success: true, expiresAt: tokenData.expires_in }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in social-refresh-token:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
