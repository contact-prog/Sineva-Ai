-- Drop the old unique index
DROP INDEX IF EXISTS idx_email_history_unique_message;

-- Delete duplicates, keeping only the one with the latest status for each provider_message_id
-- Priority: delivered > sent > bounced > failed
DELETE FROM email_history a 
USING email_history b
WHERE a.provider_message_id = b.provider_message_id 
AND a.id < b.id
AND a.provider_message_id IS NOT NULL;

-- Now create the unique index on provider_message_id only
CREATE UNIQUE INDEX idx_email_history_unique_provider_id 
ON email_history(provider_message_id) 
WHERE provider_message_id IS NOT NULL;