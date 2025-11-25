-- Create user_profiles table to store onboarding data
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Onboarding status
  onboarding_completed BOOLEAN DEFAULT FALSE NOT NULL,
  
  -- Step 1: Business Stage
  business_stage TEXT,
  
  -- Step 2: Company Info
  company_name TEXT,
  industry TEXT,
  description TEXT,
  website_url TEXT,
  scraped_data JSONB,
  
  -- Step 3: Brand Kit
  primary_color TEXT,
  secondary_color TEXT,
  accent_color TEXT,
  logo_url TEXT,
  brand_voice TEXT,
  tagline TEXT,
  
  -- Step 4: Marketing Strategy
  goals TEXT[],
  target_audience TEXT,
  monthly_budget DECIMAL,
  current_channels TEXT[],
  
  -- Step 5: AI Recommendations
  recommended_content_types TEXT[],
  recommended_platforms TEXT[],
  posting_frequency JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, onboarding_completed)
  VALUES (NEW.id, FALSE);
  RETURN NEW;
END;
$$;

-- Trigger to auto-create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add trigger for updated_at timestamp
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();