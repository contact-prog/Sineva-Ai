-- Phase 1.2: Content History System

-- Create content_history table for storing generated content
CREATE TABLE IF NOT EXISTS content_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content_type TEXT NOT NULL, -- blog, caption, email, ad_copy, social
  topic TEXT NOT NULL,
  tone TEXT,
  length TEXT,
  generated_content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE content_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own content" 
  ON content_history FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own content" 
  ON content_history FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own content" 
  ON content_history FOR DELETE 
  USING (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_content_history_user_created 
  ON content_history(user_id, created_at DESC);

-- Fix remaining search_path warnings for functions
ALTER FUNCTION handle_updated_at() SET search_path = 'public';
ALTER FUNCTION handle_new_user_profile() SET search_path = 'public';