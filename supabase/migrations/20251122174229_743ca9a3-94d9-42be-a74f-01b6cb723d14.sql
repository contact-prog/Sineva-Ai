-- Add 'gmail' to the allowed platforms in social_accounts table
ALTER TABLE public.social_accounts 
DROP CONSTRAINT IF EXISTS social_accounts_platform_check;

ALTER TABLE public.social_accounts 
ADD CONSTRAINT social_accounts_platform_check 
CHECK (platform = ANY (ARRAY['facebook'::text, 'instagram'::text, 'twitter'::text, 'linkedin'::text, 'gmail'::text]));