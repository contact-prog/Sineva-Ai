-- Add UPDATE policy for email_history so users can cancel their scheduled emails
CREATE POLICY "Users can update their own email history"
ON public.email_history
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add DELETE policy for email_history so users can delete their emails
CREATE POLICY "Users can delete their own email history"
ON public.email_history
FOR DELETE
USING (auth.uid() = user_id);

-- Verify RLS is enabled on email_history table (this should already be true)
ALTER TABLE public.email_history ENABLE ROW LEVEL SECURITY;

-- Create an index on user_id and scheduled_for for better query performance
CREATE INDEX IF NOT EXISTS idx_email_history_user_scheduled 
ON public.email_history(user_id, scheduled_for) 
WHERE send_mode = 'scheduled' AND scheduled_for IS NOT NULL;