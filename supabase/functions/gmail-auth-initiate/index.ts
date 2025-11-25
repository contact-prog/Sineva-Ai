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
    // Extract user ID from JWT (already verified by Supabase since verify_jwt=true)
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      throw new Error('Missing Authorization header');
    }

    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.sub as string | undefined;

    if (!userId) {
      throw new Error('Invalid token');
    }

    // Get the return URL from request body
    const { returnUrl } = await req.json();

    // Create admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/gmail-auth-callback`;

    if (!clientId) {
      throw new Error('Gmail OAuth not configured. Please add GOOGLE_CLIENT_ID secret.');
    }

    // Generate state for CSRF protection
    const state = crypto.randomUUID();

    console.log('Generated state for user:', userId, 'state:', state);

    // Store state in database for verification
    const { data: stateRecord, error: stateError } = await supabaseAdmin
      .from('social_accounts')
      .insert({
        user_id: userId,
        platform: 'gmail',
        account_id: `pending_${state}`,
        account_name: 'pending',
        access_token: 'pending',
        metadata: { 
          state, 
          timestamp: new Date().toISOString(),
          returnUrl: returnUrl || 'https://sineva.ai/app/email-generator'
        },
      })
      .select()
      .single();

    if (stateError) {
      console.error('Failed to store OAuth state:', stateError);
      throw new Error(`Failed to initialize OAuth: ${stateError.message}`);
    }

    console.log('Successfully stored state record:', stateRecord.id);

    // Gmail OAuth scopes
    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' ');

    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=${state}`;

    console.log('Gmail OAuth URL generated for user:', userId);

    return new Response(
      JSON.stringify({ oauthUrl, state }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in gmail-auth-initiate:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
