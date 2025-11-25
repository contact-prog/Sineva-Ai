-- Create subscription for existing authenticated user (developer@sineva.ai)
INSERT INTO public.user_subscriptions (
  user_id, 
  plan_tier, 
  status, 
  trial_ends_at,
  current_period_start,
  current_period_end,
  graphics_limit,
  videos_limit,
  chat_limit,
  content_limit,
  email_limit,
  graphics_used,
  videos_used,
  chat_used,
  content_used,
  email_used,
  overage_credits
) 
VALUES (
  '6ad3944e-393f-4c8e-a3d8-98282b9faff5',
  'enterprise',
  'active',
  NULL,
  NOW(),
  NOW() + INTERVAL '1 year',
  999999,
  999999,
  999999,
  999999,
  999999,
  0,
  0,
  0,
  0,
  0,
  0
)
ON CONFLICT (user_id) DO UPDATE SET
  plan_tier = EXCLUDED.plan_tier,
  status = EXCLUDED.status,
  graphics_limit = EXCLUDED.graphics_limit,
  videos_limit = EXCLUDED.videos_limit,
  chat_limit = EXCLUDED.chat_limit,
  content_limit = EXCLUDED.content_limit,
  email_limit = EXCLUDED.email_limit,
  current_period_end = EXCLUDED.current_period_end;

-- Also create subscriptions for any other existing users without one
INSERT INTO public.user_subscriptions (
  user_id,
  plan_tier,
  status,
  trial_ends_at,
  current_period_start,
  current_period_end,
  graphics_limit,
  videos_limit,
  chat_limit,
  content_limit,
  email_limit
)
SELECT 
  au.id,
  'starter',
  'trialing',
  NOW() + INTERVAL '14 days',
  NOW(),
  NOW() + INTERVAL '14 days',
  50,
  10,
  100,
  50,
  200
FROM auth.users au
LEFT JOIN public.user_subscriptions us ON au.id = us.user_id
WHERE us.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Update the handle_new_user_subscription trigger function to be more robust
-- This ensures every new user gets a subscription automatically
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.user_subscriptions (
    user_id,
    plan_tier,
    status,
    trial_ends_at,
    current_period_end
  ) VALUES (
    NEW.id,
    'starter',
    'trialing',
    NOW() + INTERVAL '14 days',
    NOW() + INTERVAL '14 days'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to create subscription for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;