-- Add 'outlook' to the allowed platforms in social_accounts table
ALTER TABLE social_accounts DROP CONSTRAINT IF EXISTS social_accounts_platform_check;

-- Recreate the constraint with 'outlook' included
ALTER TABLE social_accounts ADD CONSTRAINT social_accounts_platform_check 
CHECK (platform IN ('gmail', 'outlook', 'facebook', 'instagram', 'twitter', 'linkedin', 'whatsapp', 'tiktok', 'youtube'));