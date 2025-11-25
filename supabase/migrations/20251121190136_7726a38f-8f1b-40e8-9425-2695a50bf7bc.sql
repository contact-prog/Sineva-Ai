-- ============================================
-- PHASE 1: DATABASE FOUNDATION FOR CONTENT CALENDAR
-- ============================================

-- Create enum for integration platforms
CREATE TYPE integration_platform AS ENUM (
  'facebook',
  'instagram',
  'twitter',
  'linkedin',
  'whatsapp',
  'tiktok',
  'youtube',
  'pinterest',
  'google_business',
  'wordpress',
  'mailchimp',
  'shopify',
  'facebook_ads',
  'google_ads'
);

-- Create enum for posting queue status
CREATE TYPE queue_status AS ENUM (
  'pending',
  'scheduled',
  'processing',
  'published',
  'failed',
  'cancelled',
  'paused'
);

-- Create enum for post priority
CREATE TYPE post_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

-- ============================================
-- 1. INTEGRATIONS TABLE
-- ============================================
CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform integration_platform NOT NULL,
  connected BOOLEAN NOT NULL DEFAULT false,
  
  -- OAuth tokens
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  
  -- Platform-specific identifiers
  account_id TEXT,
  account_name TEXT,
  account_email TEXT,
  
  -- Platform metadata (profile pics, capabilities, etc.)
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Connection health
  last_tested_at TIMESTAMPTZ,
  last_error TEXT,
  needs_repair BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  
  -- Ensure one connection per user per platform per account
  UNIQUE(user_id, platform, account_id)
);

-- Enable RLS
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for integrations
CREATE POLICY "Users can view their own integrations"
  ON public.integrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own integrations"
  ON public.integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own integrations"
  ON public.integrations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own integrations"
  ON public.integrations FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_integrations_user_id ON public.integrations(user_id);
CREATE INDEX idx_integrations_platform ON public.integrations(platform);
CREATE INDEX idx_integrations_connected ON public.integrations(connected);

-- ============================================
-- 2. POSTING QUEUE TABLE
-- ============================================
CREATE TABLE public.posting_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Content
  content TEXT NOT NULL,
  media_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Targeting
  integration_ids UUID[] NOT NULL,
  platforms integration_platform[] NOT NULL,
  
  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  
  -- Status tracking
  status queue_status NOT NULL DEFAULT 'pending',
  priority post_priority NOT NULL DEFAULT 'medium',
  
  -- Execution tracking
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  
  -- Results
  published_at TIMESTAMPTZ,
  error_message TEXT,
  platform_post_ids JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Template/duplication
  is_template BOOLEAN DEFAULT false,
  template_name TEXT,
  parent_id UUID REFERENCES public.posting_queue(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Validation: scheduled_for must be in the future
  CONSTRAINT scheduled_for_future CHECK (scheduled_for > created_at)
);

-- Enable RLS
ALTER TABLE public.posting_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for posting_queue
CREATE POLICY "Users can view their own queue items"
  ON public.posting_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own queue items"
  ON public.posting_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own queue items"
  ON public.posting_queue FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own queue items"
  ON public.posting_queue FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_posting_queue_user_id ON public.posting_queue(user_id);
CREATE INDEX idx_posting_queue_status ON public.posting_queue(status);
CREATE INDEX idx_posting_queue_scheduled_for ON public.posting_queue(scheduled_for);
CREATE INDEX idx_posting_queue_platforms ON public.posting_queue USING GIN(platforms);
CREATE INDEX idx_posting_queue_next_retry ON public.posting_queue(next_retry_at) WHERE status = 'failed';

-- ============================================
-- 3. PUBLISHED POSTS TABLE
-- ============================================
CREATE TABLE public.published_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- References
  queue_id UUID REFERENCES public.posting_queue(id) ON DELETE SET NULL,
  integration_id UUID REFERENCES public.integrations(id) ON DELETE CASCADE,
  blog_id UUID, -- Will reference blogs table
  
  -- Platform info
  platform integration_platform NOT NULL,
  external_id TEXT NOT NULL,
  external_url TEXT NOT NULL,
  
  -- Content snapshot
  content TEXT,
  media_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Status
  status TEXT NOT NULL DEFAULT 'published',
  
  -- Engagement metrics
  sync_metadata JSONB DEFAULT '{}'::jsonb,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  
  -- Sync tracking
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sync_failures INTEGER DEFAULT 0,
  
  -- Timestamps
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure unique external posts per integration
  UNIQUE(integration_id, external_id)
);

-- Enable RLS
ALTER TABLE public.published_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for published_posts
CREATE POLICY "Users can view their own published posts"
  ON public.published_posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own published posts"
  ON public.published_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own published posts"
  ON public.published_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own published posts"
  ON public.published_posts FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_published_posts_user_id ON public.published_posts(user_id);
CREATE INDEX idx_published_posts_queue_id ON public.published_posts(queue_id);
CREATE INDEX idx_published_posts_integration_id ON public.published_posts(integration_id);
CREATE INDEX idx_published_posts_blog_id ON public.published_posts(blog_id);
CREATE INDEX idx_published_posts_platform ON public.published_posts(platform);
CREATE INDEX idx_published_posts_published_at ON public.published_posts(published_at);

-- ============================================
-- 4. BLOGS TABLE
-- ============================================
CREATE TABLE public.blogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Content
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  
  -- SEO
  keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  meta_description TEXT,
  slug TEXT,
  
  -- Categorization
  category TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Media
  featured_image_url TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft',
  
  -- AI metadata
  ai_generated BOOLEAN DEFAULT false,
  generation_metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blogs
CREATE POLICY "Users can view their own blogs"
  ON public.blogs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own blogs"
  ON public.blogs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own blogs"
  ON public.blogs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own blogs"
  ON public.blogs FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_blogs_user_id ON public.blogs(user_id);
CREATE INDEX idx_blogs_status ON public.blogs(status);
CREATE INDEX idx_blogs_published_at ON public.blogs(published_at);
CREATE INDEX idx_blogs_tags ON public.blogs USING GIN(tags);
CREATE INDEX idx_blogs_keywords ON public.blogs USING GIN(keywords);

-- Add foreign key constraint now that blogs table exists
ALTER TABLE public.published_posts
  ADD CONSTRAINT fk_published_posts_blog
  FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE SET NULL;

-- ============================================
-- 5. PROFILES TABLE (for user metadata)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  bio TEXT,
  timezone TEXT DEFAULT 'UTC',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- 6. STORAGE BUCKET FOR USER UPLOADS
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-uploads',
  'user-uploads',
  true,
  20971520, -- 20MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies for user-uploads
CREATE POLICY "Users can upload their own files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-uploads' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view all uploaded files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'user-uploads');

CREATE POLICY "Users can update their own files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'user-uploads' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'user-uploads' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================
-- 7. TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER set_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_posting_queue_updated_at
  BEFORE UPDATE ON public.posting_queue
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_published_posts_updated_at
  BEFORE UPDATE ON public.published_posts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_blogs_updated_at
  BEFORE UPDATE ON public.blogs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 8. AUTO-CREATE PROFILE ON USER SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();