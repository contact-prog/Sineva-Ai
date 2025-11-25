-- Phase 1.4: Database Security & Optimization

-- Fix function search_path warnings
ALTER FUNCTION handle_new_user() SET search_path = 'public';
ALTER FUNCTION handle_new_user_profile() SET search_path = 'public';

-- Add performance indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_graphic_generations_user_created 
  ON graphic_generations(user_id, created_at DESC);
  
CREATE INDEX IF NOT EXISTS idx_posting_queue_user_scheduled 
  ON posting_queue(user_id, scheduled_for);
  
CREATE INDEX IF NOT EXISTS idx_email_history_user_created 
  ON email_history(user_id, created_at DESC);
  
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated 
  ON conversations(user_id, updated_at DESC);

-- Add user preferences columns
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email_on_publish": true, "email_summary": true, "in_app_notifications": true}'::jsonb,
  ADD COLUMN IF NOT EXISTS generation_defaults JSONB DEFAULT '{"graphic_quality": "standard", "content_tone": "professional", "auto_logo": true}'::jsonb;