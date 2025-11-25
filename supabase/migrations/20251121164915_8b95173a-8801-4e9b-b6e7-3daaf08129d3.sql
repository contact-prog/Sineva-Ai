-- Add from_email column to store actual sender email address
ALTER TABLE email_history ADD COLUMN IF NOT EXISTS from_email text;

-- Update RLS policy to allow users to see emails they sent OR emails sent to them
DROP POLICY IF EXISTS "Users can view their own email history" ON email_history;

CREATE POLICY "Users can view their own email history"
ON email_history
FOR SELECT
USING (
  auth.uid() = user_id 
  OR recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR from_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);