-- Fix subscription creation issue
-- The service role should be able to create subscriptions for users

-- First, ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_subscription();

-- Recreate the trigger function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_subscription();

-- Ensure RLS policies allow service role to bypass RLS for subscription creation
-- The existing "Users can insert their own subscription" policy should work
-- but we'll make sure it exists and is correct

DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Service role can insert subscriptions" ON public.user_subscriptions;

-- Policy for users to insert their own subscription
CREATE POLICY "Users can insert their own subscription"
ON public.user_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Add a unique constraint to prevent duplicate subscriptions
ALTER TABLE public.user_subscriptions 
DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_key;

ALTER TABLE public.user_subscriptions 
ADD CONSTRAINT user_subscriptions_user_id_key UNIQUE (user_id);