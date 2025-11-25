import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IncrementRequest {
  serviceType: 'graphics' | 'videos' | 'chat' | 'content' | 'email';
  operationType: string;
  creditsUsed?: number;
  metadata?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { serviceType, operationType, creditsUsed = 1, metadata } = await req.json() as IncrementRequest;

    console.log('Incrementing usage for user:', user.id, 'Service:', serviceType, 'Credits:', creditsUsed);

    // Get user's subscription
    let subscription: any = null;
    const { data: subData, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (subError) {
      console.error('Error fetching subscription:', subError);
      throw new Error(`Database error: ${subError.message}`);
    }

    subscription = subData;

    if (!subscription) {
      console.log('No subscription found for user:', user.id, '- creating trial subscription');
      
      // Auto-create trial subscription for this user
      const { data: newSub, error: insertError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          plan_tier: 'starter',
          status: 'trialing',
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (insertError || !newSub) {
        console.error('Failed to create trial subscription for user:', user.id, insertError);
        throw new Error('Failed to initialize subscription. Please contact support.');
      }
      
      console.log('Successfully created trial subscription for user:', user.id);
      // Use the newly created subscription
      subscription = newSub;
    }

    const fieldMap: Record<string, string> = {
      graphics: 'graphics_used',
      videos: 'videos_used',
      chat: 'chat_used',
      content: 'content_used',
      email: 'email_used'
    };

    const usedField = fieldMap[serviceType];
    const currentUsed = subscription![usedField] || 0;
    const limitField = fieldMap[serviceType].replace('_used', '_limit');
    const limit = subscription![limitField];

    const willExceedLimit = currentUsed + creditsUsed > limit;
    const wasOverage = willExceedLimit;

    // If using overage credits, deduct them
    if (wasOverage && subscription.overage_credits >= creditsUsed) {
      console.log('Using overage credits for user:', user.id);
      const { error: overageError } = await supabase
        .from('user_subscriptions')
        .update({
          overage_credits: Math.max(0, subscription.overage_credits - creditsUsed)
        })
        .eq('user_id', user.id);
      
      if (overageError) {
        console.error('Failed to update overage credits:', overageError);
      }
    }

    // Increment usage count
    const updateData: any = {
      [usedField]: currentUsed + creditsUsed,
      updated_at: new Date().toISOString()
    };

    console.log('Updating subscription usage:', updateData);
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update(updateData)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Failed to update subscription usage:', updateError);
      throw updateError;
    }

    // Log usage to tracking table
    const { error: trackingError } = await supabase
      .from('usage_tracking')
      .insert({
        user_id: user.id,
        service_type: serviceType,
        operation_type: operationType,
        credits_used: creditsUsed,
        was_overage: wasOverage,
        metadata
      });

    if (trackingError) {
      console.error('Failed to log usage tracking:', trackingError);
      // Don't throw - this is non-critical
    }

    console.log('Successfully incremented usage for user:', user.id, 'New usage:', currentUsed + creditsUsed);

    return new Response(
      JSON.stringify({
        success: true,
        newUsage: currentUsed + creditsUsed,
        limit,
        wasOverage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Increment usage error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
