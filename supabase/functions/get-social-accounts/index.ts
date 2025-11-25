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

    console.log('Fetching social accounts for user:', user.id);

    // Get all accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('platform')
      .order('account_name');

    if (accountsError) throw accountsError;

    // Filter out expired accounts
    const activeAccounts = (accounts || []).filter(account => {
      if (!account.token_expires_at) return true;
      return new Date(account.token_expires_at) > new Date();
    });

    // Format response
    const formattedAccounts = activeAccounts.map(account => ({
      id: account.id,
      platform: account.platform,
      accountName: account.account_name,
      isActive: account.is_active,
      expiresAt: account.token_expires_at
    }));

    // Group by platform
    const byPlatform = formattedAccounts.reduce((acc, account) => {
      if (!acc[account.platform]) {
        acc[account.platform] = [];
      }
      acc[account.platform].push(account);
      return acc;
    }, {} as Record<string, any[]>);

    console.log('Found accounts:', formattedAccounts.length);

    return new Response(
      JSON.stringify({
        success: true,
        accounts: formattedAccounts,
        byPlatform,
        summary: {
          total: formattedAccounts.length,
          facebook: byPlatform.facebook?.length || 0,
          instagram: byPlatform.instagram?.length || 0,
          twitter: byPlatform.twitter?.length || 0,
          linkedin: byPlatform.linkedin?.length || 0
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in get-social-accounts:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error?.message || 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
