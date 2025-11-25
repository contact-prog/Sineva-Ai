-- Update social_posts status constraint to include new statuses
ALTER TABLE social_posts DROP CONSTRAINT IF EXISTS social_posts_status_check;

ALTER TABLE social_posts 
ADD CONSTRAINT social_posts_status_check 
CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'partial', 'failed'));