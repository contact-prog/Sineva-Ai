-- Add columns to store email threading information
ALTER TABLE public.email_history
ADD COLUMN IF NOT EXISTS message_id TEXT,
ADD COLUMN IF NOT EXISTS references_header TEXT;

-- Create index for faster lookups by message_id
CREATE INDEX IF NOT EXISTS idx_email_history_message_id ON public.email_history(message_id);

-- Add comments explaining the columns
COMMENT ON COLUMN public.email_history.message_id IS 'The Message-ID header from the email, used for threading';
COMMENT ON COLUMN public.email_history.references_header IS 'The References header chain for email threading';