-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to process scheduled emails
CREATE OR REPLACE FUNCTION public.process_scheduled_emails()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_record RECORD;
  email_account RECORD;
BEGIN
  -- Loop through scheduled emails that are due
  FOR email_record IN 
    SELECT * FROM email_history 
    WHERE status = 'scheduled' 
    AND scheduled_for <= NOW()
    ORDER BY scheduled_for ASC
    LIMIT 10
  LOOP
    BEGIN
      -- Get the user's email account
      SELECT * INTO email_account 
      FROM social_accounts 
      WHERE user_id = email_record.user_id 
      AND platform IN ('gmail', 'outlook')
      AND is_active = true
      LIMIT 1;
      
      IF FOUND THEN
        -- Update status to sending (the edge function will handle actual sending)
        UPDATE email_history 
        SET status = 'sending' 
        WHERE id = email_record.id;
        
        RAISE NOTICE 'Email % marked for sending via %', email_record.id, email_account.platform;
      ELSE
        -- No email account found
        UPDATE email_history 
        SET status = 'failed',
            error_message = 'No email account connected'
        WHERE id = email_record.id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Mark as failed on any error
      UPDATE email_history 
      SET status = 'failed',
          error_message = SQLERRM
      WHERE id = email_record.id;
    END;
  END LOOP;
END;
$$;

-- Schedule the function to run every 30 seconds
SELECT cron.schedule(
  'process-scheduled-emails-cron',
  '30 seconds',
  'SELECT public.process_scheduled_emails();'
);