-- Drop the broken RLS policy
DROP POLICY IF EXISTS "Users can view their own email history" ON email_history;

-- Create a simple RLS policy that just checks user_id
-- Users can see emails where they are the sender (user_id matches)
CREATE POLICY "Users can view their own email history"
ON email_history
FOR SELECT
USING (auth.uid() = user_id);