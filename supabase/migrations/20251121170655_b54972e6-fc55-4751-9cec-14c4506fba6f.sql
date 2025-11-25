-- Make send_mode nullable since it only applies to sent emails, not received ones
ALTER TABLE email_history ALTER COLUMN send_mode DROP NOT NULL;