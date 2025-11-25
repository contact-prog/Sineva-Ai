import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // This endpoint is used to refresh/validate WordPress connections
    const { integrationId } = await req.json();
    
    console.log('WordPress auth callback/refresh for integration:', integrationId);

    if (!integrationId) {
      throw new Error('Missing integrationId');
    }

    // Get authorization header and user
    const authHeader = req.headers.get('authorization');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader || '' } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get the integration
    const { data: integration, error: integrationError } = await supabaseClient
      .from('integrations')
      .select('*')
      .eq('id', integrationId)
      .eq('user_id', user.id)
      .eq('platform', 'wordpress')
      .single();

    if (integrationError || !integration) {
      throw new Error('Integration not found');
    }

    const siteUrl = integration.metadata?.site_url;
    if (!siteUrl) {
      throw new Error('Site URL not found in integration metadata');
    }

    // Test the connection
    console.log('Testing WordPress connection for:', siteUrl);
    const testResponse = await fetch(`${siteUrl}/wp-json/wp/v2/users/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${integration.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!testResponse.ok) {
      console.error('WordPress connection test failed:', testResponse.status);
      
      // Update integration as needing repair
      await supabaseClient
        .from('integrations')
        .update({
          connected: false,
          needs_repair: true,
          last_error: `Connection test failed with status ${testResponse.status}`,
          last_tested_at: new Date().toISOString(),
        })
        .eq('id', integrationId);

      throw new Error('WordPress connection test failed. Please reconnect your site.');
    }

    const wpUser = await testResponse.json();
    console.log('WordPress connection valid for user:', wpUser.name);

    // Update integration status
    await supabaseClient
      .from('integrations')
      .update({
        connected: true,
        needs_repair: false,
        last_error: null,
        last_tested_at: new Date().toISOString(),
        account_name: wpUser.name,
        account_email: wpUser.email || integration.account_email,
      })
      .eq('id', integrationId);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'WordPress connection validated successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in wordpress-auth-callback:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});