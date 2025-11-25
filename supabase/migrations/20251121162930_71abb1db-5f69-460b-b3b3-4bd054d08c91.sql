-- Add new columns to email_history table for webhook support
ALTER TABLE email_history
ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'sent',
ADD COLUMN IF NOT EXISTS event_type text,
ADD COLUMN IF NOT EXISTS message_html text,
ADD COLUMN IF NOT EXISTS message_text text,
ADD COLUMN IF NOT EXISTS attachments jsonb,
ADD COLUMN IF NOT EXISTS provider_message_id text,
ADD COLUMN IF NOT EXISTS pending_body boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS raw_event_json jsonb,
ADD COLUMN IF NOT EXISTS read_at timestamp with time zone;

-- Add check constraint for direction
ALTER TABLE email_history
ADD CONSTRAINT email_history_direction_check 
CHECK (direction IN ('sent', 'received'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_email_history_direction ON email_history(direction);
CREATE INDEX IF NOT EXISTS idx_email_history_status ON email_history(status);
CREATE INDEX IF NOT EXISTS idx_email_history_event_type ON email_history(event_type);
CREATE INDEX IF NOT EXISTS idx_email_history_provider_message_id ON email_history(provider_message_id);

-- Add full text search support for subject and body
CREATE INDEX IF NOT EXISTS idx_email_history_subject_search 
ON email_history USING gin(to_tsvector('english', subject));

CREATE INDEX IF NOT EXISTS idx_email_history_body_search 
ON email_history USING gin(to_tsvector('english', COALESCE(message_text, '')));

-- Update RLS policy to allow webhook to insert without user context
-- This is safe because the webhook will validate the message belongs to a user
CREATE POLICY "Webhook can insert email events"
ON email_history
FOR INSERT
WITH CHECK (true);

-- Keep existing user policies for viewing their own emails
-- Users can view emails they sent OR received
DROP POLICY IF EXISTS "Users can view their own email history" ON email_history;
CREATE POLICY "Users can view their own email history"
ON email_history
FOR SELECT
USING (
  auth.uid() = user_id 
  OR recipient_email IN (
    SELECT email FROM auth.users WHERE id = auth.uid()
  )
);