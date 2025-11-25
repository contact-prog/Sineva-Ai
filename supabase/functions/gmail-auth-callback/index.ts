import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      const defaultUrl = `${Deno.env.get('SUPABASE_URL') || 'https://sineva.ai'}/app/email-generator`;
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${defaultUrl}?error=${error}`,
        },
      });
    }

    if (!code || !state) {
      throw new Error('Missing code or state parameter');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Verifying state:', state);

    // Verify state - look for pending record
    const { data: pendingAuth, error: stateError } = await supabaseAdmin
      .from('social_accounts')
      .select('id, user_id, metadata')
      .eq('platform', 'gmail')
      .eq('account_id', `pending_${state}`)
      .single();

    console.log('State lookup result:', { found: !!pendingAuth, error: stateError?.message });

    if (stateError || !pendingAuth) {
      console.error('State verification failed:', { stateError, state });
      throw new Error('Invalid state parameter - OAuth session may have expired');
    }

    console.log('State verified for user:', pendingAuth.user_id);

    // Exchange code for tokens
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/gmail-auth-callback`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Token exchange error:', tokens);
      throw new Error(tokens.error_description || 'Failed to exchange code for tokens');
    }

    // Get user profile from Google
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const profile = await profileResponse.json();

    // Calculate token expiry
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (tokens.expires_in || 3600));

    // Delete the pending state record and insert the actual connection
    const { error: deleteError } = await supabaseAdmin
      .from('social_accounts')
      .delete()
      .eq('id', pendingAuth.id);

    if (deleteError) {
      console.error('Failed to delete pending record:', deleteError);
    }

    // Store tokens in database
    const { error: insertError } = await supabaseAdmin
      .from('social_accounts')
      .insert({
        user_id: pendingAuth.user_id,
        platform: 'gmail',
        account_id: profile.email,
        account_name: profile.email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        token_expires_at: expiresAt.toISOString(),
        is_active: true,
        metadata: {
          email: profile.email,
          picture: profile.picture,
          scopes: tokens.scope,
        },
      });

    if (insertError) {
      console.error('Failed to store Gmail connection:', insertError);
      throw new Error(`Failed to save connection: ${insertError.message}`);
    }

    console.log('Gmail connected successfully for user:', pendingAuth.user_id);

    // Redirect back to where user came from
    const returnUrl = pendingAuth.metadata?.returnUrl || `${Deno.env.get('SUPABASE_URL') || 'https://sineva.ai'}/app/email-generator`;
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${returnUrl}?connected=gmail`,
      },
    });
  } catch (error) {
    console.error('Error in gmail-auth-callback:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const defaultUrl = `${Deno.env.get('SUPABASE_URL') || 'https://sineva.ai'}/app/email-generator`;
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${defaultUrl}?error=${encodeURIComponent(errorMessage)}`,
      },
    });
  }
});
