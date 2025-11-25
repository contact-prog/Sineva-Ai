import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UsageCheckRequest {
  serviceType: 'graphics' | 'videos' | 'chat' | 'content' | 'email';
  creditsNeeded?: number;
  userId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { serviceType, creditsNeeded = 1, userId } = await req.json() as UsageCheckRequest;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Client for privileged DB access (bypasses RLS where needed)
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Resolve the effective user id
    let effectiveUserId = userId;

    if (!effectiveUserId) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        throw new Error('No authorization header');
      }

      // Separate client for auth using the user's JWT
      const authClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: userError } = await authClient.auth.getUser();
      if (userError || !user) {
        throw new Error('Unauthorized');
      }

      effectiveUserId = user.id;
    }

    console.log('Checking usage for user:', effectiveUserId, 'Service:', serviceType, 'Credits needed:', creditsNeeded);

    // Get user's subscription
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', effectiveUserId)
      .maybeSingle();

    if (subError || !subscription) {
      console.log('No subscription found for user:', effectiveUserId, '- Auto-creating trial');
      
      // No subscription found - create a free trial subscription
      const { data: newSub, error: insertError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: effectiveUserId,
          plan_tier: 'starter',
          status: 'trialing',
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.warn('Failed to create subscription, allowing access anyway:', insertError);
        // Allow access even if subscription creation fails (development-friendly)
        return new Response(
          JSON.stringify({
            allowed: true,
            remaining: 999999,
            message: 'Development mode: Access granted without subscription',
            devMode: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Successfully created trial subscription for user:', effectiveUserId);
      return new Response(
        JSON.stringify({
          allowed: true,
          remaining: getLimit('starter', serviceType),
          message: 'Welcome! 14-day free trial started.',
          subscription: newSub
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if trial or subscription has expired
    if (subscription.status === 'trialing' && new Date(subscription.trial_ends_at!) < new Date()) {
      return new Response(
        JSON.stringify({
          allowed: false,
          remaining: 0,
          message: 'Your free trial has ended. Please upgrade to continue.',
          needsUpgrade: true,
          currentPlan: subscription.plan_tier
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (subscription.status === 'cancelled' || subscription.status === 'past_due') {
      return new Response(
        JSON.stringify({
          allowed: false,
          remaining: 0,
          message: 'Your subscription is inactive. Please update your billing.',
          needsUpgrade: true,
          currentPlan: subscription.plan_tier
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check usage against limits
    const limit = getLimit(subscription.plan_tier, serviceType);
    const used = getUsed(subscription, serviceType);
    const remaining = Math.max(0, limit - used);

    if (remaining < creditsNeeded) {
      // Check if user has overage credits
      if (subscription.overage_credits >= creditsNeeded) {
        return new Response(
          JSON.stringify({
            allowed: true,
            remaining: remaining,
            message: 'Using overage credits',
            usingOverage: true,
            overageCredits: subscription.overage_credits
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          allowed: false,
          remaining: remaining,
          message: `${serviceType} limit reached. Upgrade or purchase credits to continue.`,
          needsUpgrade: true,
          currentPlan: subscription.plan_tier,
          limit,
          used
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        allowed: true,
        remaining: remaining,
        message: 'Usage within limits',
        limit,
        used,
        currentPlan: subscription.plan_tier
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Usage check error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getLimit(planTier: string, serviceType: string): number {
  const limits: Record<string, Record<string, number>> = {
    starter: { graphics: 50, videos: 10, chat: 100, content: 50, email: 200 },
    professional: { graphics: 200, videos: 40, chat: 500, content: 200, email: 1000 },
    business: { graphics: 500, videos: 100, chat: 2000, content: 500, email: 5000 },
    enterprise: { graphics: 999999, videos: 999999, chat: 999999, content: 999999, email: 999999 }
  };
  return limits[planTier]?.[serviceType] || 0;
}

function getUsed(subscription: any, serviceType: string): number {
  const fieldMap: Record<string, string> = {
    graphics: 'graphics_used',
    videos: 'videos_used',
    chat: 'chat_used',
    content: 'content_used',
    email: 'email_used'
  };
  return subscription[fieldMap[serviceType]] || 0;
}
