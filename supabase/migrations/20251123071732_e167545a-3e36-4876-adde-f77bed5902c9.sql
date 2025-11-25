-- Add app tour completion tracking to user profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS app_tour_completed BOOLEAN DEFAULT false;

-- Add sample data tracking to existing tables
ALTER TABLE brand_assets
ADD COLUMN IF NOT EXISTS is_sample BOOLEAN DEFAULT false;

ALTER TABLE content_history
ADD COLUMN IF NOT EXISTS is_sample BOOLEAN DEFAULT false;

ALTER TABLE video_generations
ADD COLUMN IF NOT EXISTS is_sample BOOLEAN DEFAULT false;

ALTER TABLE posting_queue
ADD COLUMN IF NOT EXISTS is_sample BOOLEAN DEFAULT false;