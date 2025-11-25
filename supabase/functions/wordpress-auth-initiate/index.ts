import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { authenticateRequest } from "../_shared/auth-helpers.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { siteUrl, username, applicationPassword } = await req.json();
    
    console.log('WordPress auth initiate for site:', siteUrl);

    if (!siteUrl || !username || !applicationPassword) {
      throw new Error('Missing required fields: siteUrl, username, or applicationPassword');
    }

    // Validate site URL format
    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(siteUrl)) {
      throw new Error('Invalid site URL format. Must start with http:// or https://');
    }

    // Clean up site URL (remove trailing slash)
    const cleanSiteUrl = siteUrl.replace(/\/$/, '');

    // Authenticate user and get Supabase client (service role)
    const authResult = await authenticateRequest(req);
    if (authResult.error || !authResult.userId) {
      console.error('User authentication failed:', authResult.error);
      throw new Error(authResult.error || 'Unauthorized');
    }

    const supabaseClient = authResult.supabase;
    const userId = authResult.userId;

    // Test WordPress connection with Application Password
    const authString = btoa(`${username}:${applicationPassword}`);
    
    console.log('Testing WordPress REST API connection...');
    const testResponse = await fetch(`${cleanSiteUrl}/wp-json/wp/v2/users/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
      },
    });

    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.error('WordPress API test failed:', testResponse.status, errorText);
      throw new Error(`WordPress authentication failed. Please check your site URL, username, and application password. Status: ${testResponse.status}`);
    }

    const wpUser = await testResponse.json();
    console.log('WordPress user authenticated:', wpUser.name);

    // Get user capabilities
    const capabilitiesResponse = await fetch(`${cleanSiteUrl}/wp-json/wp/v2/users/${wpUser.id}?context=edit`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
      },
    });

    let capabilities = {};
    if (capabilitiesResponse.ok) {
      const fullUser = await capabilitiesResponse.json();
      capabilities = fullUser.capabilities || {};
    }

    // Store or update integration
    const { data: existingIntegration } = await supabaseClient
      .from('integrations')
      .select('id')
      .eq('user_id', userId)
      .eq('platform', 'wordpress')
      .eq('metadata->>site_url', cleanSiteUrl)
      .single();

    const integrationData = {
      user_id: userId,
      platform: 'wordpress',
      connected: true,
      access_token: authString, // Store the base64 encoded auth string
      account_name: wpUser.name || username,
      account_email: wpUser.email || null,
      account_id: wpUser.id.toString(),
      metadata: {
        site_url: cleanSiteUrl,
        username: username,
        capabilities: capabilities,
        avatar_urls: wpUser.avatar_urls || {},
      },
      token_expires_at: null, // Application passwords don't expire
      last_tested_at: new Date().toISOString(),
    };

    let integration;
    if (existingIntegration) {
      const { data, error } = await supabaseClient
        .from('integrations')
        .update(integrationData)
        .eq('id', existingIntegration.id)
        .select()
        .single();

      if (error) throw error;
      integration = data;
      console.log('Updated existing WordPress integration');
    } else {
      const { data, error } = await supabaseClient
        .from('integrations')
        .insert(integrationData)
        .select()
        .single();

      if (error) throw error;
      integration = data;
      console.log('Created new WordPress integration');
    }

    return new Response(
      JSON.stringify({
        success: true,
        integration,
        message: 'WordPress site connected successfully!',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in wordpress-auth-initiate:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});