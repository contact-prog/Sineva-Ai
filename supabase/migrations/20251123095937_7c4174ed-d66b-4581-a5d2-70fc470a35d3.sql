-- Add onboarding_magic_completed field to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_magic_completed BOOLEAN DEFAULT FALSE;

-- Update existing profiles to have onboarding_magic_completed = false if null
UPDATE user_profiles SET onboarding_magic_completed = FALSE WHERE onboarding_magic_completed IS NULL;