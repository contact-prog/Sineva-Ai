-- First, make user_id nullable
ALTER TABLE email_history ALTER COLUMN user_id DROP NOT NULL;

-- Delete duplicate entries, keeping only the first one for each message_id + event_type combination
DELETE FROM email_history a USING email_history b
WHERE a.id > b.id 
AND a.provider_message_id = b.provider_message_id 
AND a.event_type = b.event_type
AND a.provider_message_id IS NOT NULL;

-- Now add the unique constraint
CREATE UNIQUE INDEX idx_email_history_unique_message 
ON email_history(provider_message_id, event_type) 
WHERE provider_message_id IS NOT NULL;