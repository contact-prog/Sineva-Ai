import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OAuthConfig {
  authUrl: string;
  clientId: string;
  scopes: string;
  redirectUri: string;
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

    const { platform } = await req.json();
    console.log('Initiating OAuth for platform:', platform);

    const redirectUri = `${req.headers.get('origin') || 'http://localhost:8080'}/social/callback`;
    const state = crypto.randomUUID();

    // Store state in localStorage via response for CSRF protection
    const stateData = {
      state,
      userId: user.id,
      platform,
      timestamp: Date.now()
    };

    let oauthUrl: string;

    switch (platform) {
      case 'facebook':
      case 'instagram': {
        const clientId = Deno.env.get('FACEBOOK_APP_ID');
        const scopes = platform === 'facebook' 
          ? 'pages_manage_posts,pages_read_engagement,public_profile'
          : 'instagram_basic,instagram_content_publish';
        
        oauthUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
          `client_id=${clientId}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&state=${state}` +
          `&scope=${encodeURIComponent(scopes)}`;
        break;
      }

      case 'twitter': {
        const clientId = Deno.env.get('TWITTER_API_KEY');
        const scopes = 'tweet.read tweet.write users.read offline.access';
        
        oauthUrl = `https://twitter.com/i/oauth2/authorize?` +
          `response_type=code` +
          `&client_id=${clientId}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&scope=${encodeURIComponent(scopes)}` +
          `&state=${state}` +
          `&code_challenge=challenge` +
          `&code_challenge_method=plain`;
        break;
      }

      case 'linkedin': {
        const clientId = Deno.env.get('LINKEDIN_CLIENT_ID');
        const scopes = 'openid profile email w_member_social';
        
        oauthUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
          `response_type=code` +
          `&client_id=${clientId}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&state=${state}` +
          `&scope=${encodeURIComponent(scopes)}`;
        break;
      }

      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    console.log('Generated OAuth URL for', platform);

    return new Response(
      JSON.stringify({ oauthUrl, stateData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in social-auth-initiate:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
