-- Fix RLS policy to use auth.email() instead of querying auth.users
DROP POLICY IF EXISTS "Users can view their own email history" ON email_history;

CREATE POLICY "Users can view their own email history"
ON email_history
FOR SELECT
USING (
  auth.uid() = user_id 
  OR recipient_email = auth.email()
);