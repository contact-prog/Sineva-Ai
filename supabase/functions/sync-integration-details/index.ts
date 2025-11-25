import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { integrationId, platform } = await req.json();
    console.log(`🔄 Syncing integration details for ${platform} (${integrationId})`);

    const { data: integration, error: fetchError } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', integrationId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !integration) {
      throw new Error('Integration not found');
    }

    if (!integration.access_token) {
      throw new Error('Integration missing access token');
    }

    const platformLower = platform.toLowerCase();
    let accountDetails: any = {};

    if (platformLower === 'facebook') {
      console.log('📘 Fetching ALL Facebook page details...');
      const pagesResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,category,tasks&access_token=${integration.access_token}`,
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (!pagesResponse.ok) {
        const errorText = await pagesResponse.text();
        console.error('❌ Facebook API error:', errorText);
        throw new Error(`Facebook API error: ${pagesResponse.status}`);
      }

      const pagesData = await pagesResponse.json();

      if (!pagesData.data || pagesData.data.length === 0) {
        throw new Error(
          'No Facebook Pages found. You must be an admin of at least one Facebook Page.'
        );
      }

      const allPages = pagesData.data.map((page: any) => ({
        id: page.id,
        name: page.name,
        access_token: page.access_token,
        category: page.category,
        tasks: page.tasks
      }));
      
      const primaryPage = pagesData.data[0];
      accountDetails = {
        account_id: primaryPage.id,
        account_name: primaryPage.name,
        page_id: primaryPage.id,
        page_access_token: primaryPage.access_token,
        all_pages: allPages,
        total_pages: allPages.length
      };

    } else if (platformLower === 'instagram') {
      const pagesResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?access_token=${integration.access_token}`,
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (!pagesResponse.ok) {
        throw new Error(`Facebook API error: ${pagesResponse.status}`);
      }

      const pagesData = await pagesResponse.json();
      if (!pagesData.data || pagesData.data.length === 0) {
        throw new Error('No Facebook Pages found for Instagram.');
      }

      const page = pagesData.data[0];

      const igResponse = await fetch(
        `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`,
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (!igResponse.ok) {
        throw new Error(`Instagram API error: ${igResponse.status}`);
      }

      const igData = await igResponse.json();

      if (!igData.instagram_business_account) {
        throw new Error('No Instagram Business Account linked to your Facebook Page.');
      }

      const igAccountId = igData.instagram_business_account.id;

      const igDetailsResponse = await fetch(
        `https://graph.facebook.com/v18.0/${igAccountId}?fields=id,username,profile_picture_url&access_token=${page.access_token}`,
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (!igDetailsResponse.ok) {
        throw new Error(`Instagram details API error: ${igDetailsResponse.status}`);
      }

      const igDetails = await igDetailsResponse.json();

      accountDetails = {
        account_id: igAccountId,
        account_name: igDetails.username,
        page_id: page.id,
        page_access_token: page.access_token,
        profile_picture_url: igDetails.profile_picture_url,
      };
    } else {
      throw new Error(`Platform ${platform} not supported for sync`);
    }

    const { error: updateError } = await supabase
      .from('integrations')
      .update({
        metadata: accountDetails,
        connected: true,
      })
      .eq('id', integrationId);

    if (updateError) {
      console.error('❌ Failed to update integration:', updateError);
      throw updateError;
    }

    console.log('✅ Integration synced successfully');

    return new Response(
      JSON.stringify({
        success: true,
        accountDetails,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('❌ Sync error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to sync integration details',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
