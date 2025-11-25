-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_tier TEXT NOT NULL DEFAULT 'starter' CHECK (plan_tier IN ('starter', 'professional', 'business', 'enterprise')),
  billing_period TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'annual')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing')),
  
  -- Usage Limits
  graphics_limit INTEGER NOT NULL DEFAULT 50,
  videos_limit INTEGER NOT NULL DEFAULT 10,
  chat_limit INTEGER NOT NULL DEFAULT 100,
  content_limit INTEGER NOT NULL DEFAULT 50,
  email_limit INTEGER NOT NULL DEFAULT 200,
  
  -- Current Usage (resets on billing cycle)
  graphics_used INTEGER NOT NULL DEFAULT 0,
  videos_used INTEGER NOT NULL DEFAULT 0,
  chat_used INTEGER NOT NULL DEFAULT 0,
  content_used INTEGER NOT NULL DEFAULT 0,
  email_used INTEGER NOT NULL DEFAULT 0,
  
  -- Overage & Billing
  overage_credits INTEGER NOT NULL DEFAULT 0,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW() + INTERVAL '1 month',
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Create usage_tracking table for detailed logs
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL CHECK (service_type IN ('graphics', 'videos', 'chat', 'content', 'email')),
  operation_type TEXT NOT NULL,
  credits_used INTEGER NOT NULL DEFAULT 1,
  was_overage BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_period_end ON public.user_subscriptions(current_period_end);
CREATE INDEX idx_usage_tracking_user_id ON public.usage_tracking(user_id);
CREATE INDEX idx_usage_tracking_service ON public.usage_tracking(service_type);
CREATE INDEX idx_usage_tracking_created_at ON public.usage_tracking(created_at);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view their own subscription"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription"
  ON public.user_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
  ON public.user_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for usage_tracking
CREATE POLICY "Users can view their own usage"
  ON public.usage_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage"
  ON public.usage_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to auto-create subscription on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
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
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create subscription on user signup
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

-- Function to reset usage on billing cycle
CREATE OR REPLACE FUNCTION public.reset_usage_on_cycle()
RETURNS void AS $$
BEGIN
  UPDATE public.user_subscriptions
  SET 
    graphics_used = 0,
    videos_used = 0,
    chat_used = 0,
    content_used = 0,
    email_used = 0,
    current_period_start = current_period_end,
    current_period_end = current_period_end + INTERVAL '1 month',
    updated_at = NOW()
  WHERE current_period_end <= NOW()
    AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();