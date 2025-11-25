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

    const { code, state, platform } = await req.json();
    console.log('Processing OAuth callback for platform:', platform);

    const redirectUri = `${req.headers.get('origin') || 'http://localhost:8080'}/social/callback`;
    console.log('Redirect URI:', redirectUri);
    
    let tokenData: any;

    switch (platform) {
      case 'facebook':
      case 'instagram': {
        const clientId = Deno.env.get('FACEBOOK_APP_ID');
        const clientSecret = Deno.env.get('FACEBOOK_APP_SECRET');
        
        console.log('Exchanging code for access token...');
        
        // Exchange code for access token
        const tokenResponse = await fetch(
          `https://graph.facebook.com/v18.0/oauth/access_token?` +
          `client_id=${clientId}` +
          `&client_secret=${clientSecret}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&code=${code}`
        );
        
        tokenData = await tokenResponse.json();
        console.log('Token response status:', tokenResponse.status);
        console.log('Token data received:', { 
          hasAccessToken: !!tokenData.access_token,
          expiresIn: tokenData.expires_in,
          tokenType: tokenData.token_type,
          error: tokenData.error 
        });
        
        if (tokenData.error) {
          throw new Error(`Facebook OAuth error: ${tokenData.error.message}`);
        }

        if (!tokenData.access_token) {
          throw new Error('No access token received from Facebook');
        }

        // Get user profile
        console.log('Fetching user profile...');
        const profileResponse = await fetch(
          `https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${tokenData.access_token}`
        );
        const profile = await profileResponse.json();
        console.log('Profile received:', { id: profile.id, name: profile.name });

        if (profile.error) {
          throw new Error(`Facebook profile error: ${profile.error.message}`);
        }

        // Calculate token expiration (default to 60 days if not provided)
        const expiresInSeconds = tokenData.expires_in || (60 * 24 * 60 * 60); // 60 days default
        const tokenExpiresAt = new Date(Date.now() + (expiresInSeconds * 1000)).toISOString();
        console.log('Token will expire at:', tokenExpiresAt);

        // Store in database
        const { error: insertError } = await supabase
          .from('social_accounts')
          .upsert({
            user_id: user.id,
            platform: platform,
            account_id: profile.id,
            account_name: profile.name,
            access_token: tokenData.access_token,
            token_expires_at: tokenExpiresAt,
            is_active: true,
            metadata: { profile, token_type: tokenData.token_type }
          }, {
            onConflict: 'user_id,platform,account_id'
          });

        if (insertError) {
          console.error('Database insert error:', insertError);
          throw insertError;
        }

        console.log('Successfully stored account in database');
        break;
      }

      case 'twitter': {
        const clientId = Deno.env.get('TWITTER_API_KEY');
        const clientSecret = Deno.env.get('TWITTER_API_SECRET');
        
        console.log('Exchanging Twitter code for access token...');
        
        // Exchange code for access token
        const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`
          },
          body: new URLSearchParams({
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
            code_verifier: 'challenge'
          }).toString()
        });
        
        tokenData = await tokenResponse.json();
        console.log('Twitter token response:', { 
          hasAccessToken: !!tokenData.access_token,
          expiresIn: tokenData.expires_in,
          error: tokenData.error 
        });
        
        if (tokenData.error) {
          throw new Error(`Twitter OAuth error: ${tokenData.error_description}`);
        }

        if (!tokenData.access_token) {
          throw new Error('No access token received from Twitter');
        }

        // Get user profile
        console.log('Fetching Twitter profile...');
        const profileResponse = await fetch('https://api.twitter.com/2/users/me', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`
          }
        });
        const profileData = await profileResponse.json();
        const profile = profileData.data;

        if (!profile) {
          throw new Error('Failed to fetch Twitter profile');
        }

        // Calculate token expiration (default to 2 hours if not provided)
        const expiresInSeconds = tokenData.expires_in || (2 * 60 * 60);
        const tokenExpiresAt = new Date(Date.now() + (expiresInSeconds * 1000)).toISOString();

        // Store in database
        const { error: insertError } = await supabase
          .from('social_accounts')
          .upsert({
            user_id: user.id,
            platform: 'twitter',
            account_id: profile.id,
            account_name: profile.username,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            token_expires_at: tokenExpiresAt,
            is_active: true,
            metadata: { profile }
          }, {
            onConflict: 'user_id,platform,account_id'
          });

        if (insertError) {
          console.error('Twitter database insert error:', insertError);
          throw insertError;
        }

        console.log('Successfully stored Twitter account');
        break;
      }

      case 'linkedin': {
        const clientId = Deno.env.get('LINKEDIN_CLIENT_ID');
        const clientSecret = Deno.env.get('LINKEDIN_CLIENT_SECRET');
        
        if (!clientId || !clientSecret) {
          throw new Error('LinkedIn credentials not configured');
        }
        
        console.log('Exchanging LinkedIn code for access token...');
        
        // Exchange code for access token
        const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: clientId,
            client_secret: clientSecret
          }).toString()
        });
        
        tokenData = await tokenResponse.json();
        console.log('LinkedIn token response:', { 
          hasAccessToken: !!tokenData.access_token,
          expiresIn: tokenData.expires_in,
          error: tokenData.error 
        });
        
        if (tokenData.error) {
          throw new Error(`LinkedIn OAuth error: ${tokenData.error_description}`);
        }

        if (!tokenData.access_token) {
          throw new Error('No access token received from LinkedIn');
        }

        // Get user profile
        console.log('Fetching LinkedIn profile...');
        const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`
          }
        });
        const profile = await profileResponse.json();

        if (profile.error) {
          throw new Error(`LinkedIn profile error: ${profile.error}`);
        }

        // Calculate token expiration (default to 60 days if not provided)
        const expiresInSeconds = tokenData.expires_in || (60 * 24 * 60 * 60);
        const tokenExpiresAt = new Date(Date.now() + (expiresInSeconds * 1000)).toISOString();

        // Store in database
        const { error: insertError } = await supabase
          .from('social_accounts')
          .upsert({
            user_id: user.id,
            platform: 'linkedin',
            account_id: profile.sub,
            account_name: profile.name,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            token_expires_at: tokenExpiresAt,
            is_active: true,
            metadata: { profile }
          }, {
            onConflict: 'user_id,platform,account_id'
          });

        if (insertError) {
          console.error('LinkedIn database insert error:', insertError);
          throw insertError;
        }

        console.log('Successfully stored LinkedIn account');
        break;
      }

      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    console.log('Successfully stored OAuth token for', platform);

    return new Response(
      JSON.stringify({ success: true, platform }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in social-auth-callback:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
