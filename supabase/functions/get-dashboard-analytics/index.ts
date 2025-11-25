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
    const authHeader = req.headers.get('authorization') || '';

    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');

    let userId: string;
    try {
      const payload = JSON.parse(
        atob(token.split('.')[1] ?? '')
      ) as { sub?: string };
      if (!payload.sub) {
        throw new Error('No sub in token');
      }
      userId = payload.sub;
    } catch (e) {
      console.error('Error decoding JWT payload:', e);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('Authenticated user:', userId);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get graphics stats
    const { data: graphicsData, error: graphicsError } = await supabaseClient
      .from('graphic_generations')
      .select('cost_estimate, created_at')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    const graphicsCount = graphicsData?.length || 0;
    const graphicsCost = graphicsData?.reduce((sum, g) => sum + (g.cost_estimate || 0), 0) || 0;

    // Get email stats
    const { data: emailsData, error: emailsError } = await supabaseClient
      .from('email_history')
      .select('direction, status, created_at')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    const emailsSent = emailsData?.filter(e => e.direction === 'sent' && e.status === 'delivered').length || 0;
    const emailsReceived = emailsData?.filter(e => e.direction === 'received').length || 0;

    // Get social/calendar stats
    const { data: scheduledData, error: scheduledError } = await supabaseClient
      .from('posting_queue')
      .select('status, created_at')
      .eq('user_id', userId);

    const scheduledCount = scheduledData?.filter(p => p.status === 'scheduled' || p.status === 'pending').length || 0;
    
    const { data: publishedData, error: publishedError } = await supabaseClient
      .from('published_posts')
      .select('id, created_at')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    const publishedCount = publishedData?.length || 0;

    // Get connected accounts
    const { data: accountsData, error: accountsError } = await supabaseClient
      .from('integrations')
      .select('platform')
      .eq('user_id', userId)
      .eq('connected', true);

    const connectedAccounts = accountsData?.length || 0;

    // Get conversation count
    const { data: conversationsData, error: conversationsError } = await supabaseClient
      .from('conversations')
      .select('id, created_at')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    const activeConversations = conversationsData?.length || 0;

    // Calculate total spend (from graphics + any other costs)
    const totalSpend = graphicsCost;

    const analytics = {
      graphics: {
        count: graphicsCount,
        cost: parseFloat(graphicsCost.toFixed(2))
      },
      emails: {
        sent: emailsSent,
        received: emailsReceived
      },
      social: {
        scheduled: scheduledCount,
        published: publishedCount,
        connectedAccounts
      },
      ai: {
        activeConversations
      },
      totalSpend: parseFloat(totalSpend.toFixed(2)),
      period: '30days'
    };

    console.log('Dashboard analytics:', analytics);

    return new Response(
      JSON.stringify(analytics),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
