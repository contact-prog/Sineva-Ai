-- Create email_history table
CREATE TABLE public.email_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  send_mode text NOT NULL, -- 'single' or 'bulk'
  recipient_email text NOT NULL,
  cc_emails text[] NULL,
  from_name text NULL,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL, -- 'sent' or 'failed'
  error_message text NULL,
  resend_email_id text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.email_history ENABLE ROW LEVEL SECURITY;

-- Create policies for email_history
CREATE POLICY "Users can view their own email history"
ON public.email_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email history"
ON public.email_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_email_history_user_created ON public.email_history(user_id, created_at DESC);