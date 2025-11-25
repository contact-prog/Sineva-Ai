-- Add scheduled_for column to email_history table to properly track scheduled emails
ALTER TABLE public.email_history 
ADD COLUMN IF NOT EXISTS scheduled_for timestamp with time zone;

-- Add index for better performance when querying scheduled emails
CREATE INDEX IF NOT EXISTS idx_email_history_scheduled_for 
ON public.email_history(scheduled_for) 
WHERE scheduled_for IS NOT NULL;