import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

export interface AuthResult {
  userId: string;
  supabase: any;
  error?: string;
}

/**
 * Unified authentication helper for all edge functions
 * Handles JWT validation and auto-creates trial subscriptions
 */
export async function authenticateRequest(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader) {
    return { 
      userId: '', 
      supabase: null,
      error: 'No authorization header' 
    };
  }

  // Extract JWT token from "Bearer <token>" format
  const jwt = authHeader.replace('Bearer ', '');

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Validate the user's JWT
  const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
  
  if (userError || !user) {
    console.error('JWT validation failed:', userError);
    return { 
      userId: '', 
      supabase,
      error: 'Unauthorized' 
    };
  }

  // Ensure user has a subscription (auto-create if needed)
  await ensureSubscription(supabase, user.id);

  return { 
    userId: user.id, 
    supabase,
  };
}

/**
 * Ensures user has a subscription, creates trial if missing
 */
async function ensureSubscription(supabase: any, userId: string): Promise<void> {
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!subscription) {
    console.log(`Auto-creating trial subscription for user: ${userId}`);
    
    await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        plan_tier: 'starter',
        status: 'trialing',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      });
  }
}
