-- Drop the SQL function approach
DROP FUNCTION IF EXISTS public.process_scheduled_emails();

-- Create HTTP-based cron job that calls the edge function every 30 seconds
SELECT cron.schedule(
  'process-scheduled-emails-job',
  '30 seconds',
  $$
  SELECT net.http_post(
    url:='https://apxigjramwlzjifjesph.supabase.co/functions/v1/process-scheduled-emails',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFweGlnanJhbXdsemppZmplc3BoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NzkzMTQsImV4cCI6MjA3OTI1NTMxNH0.7BjjnCBi9hx8CV8fOD4qOeGEgL2MoQKEzrWsMTln0qU"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);

-- Fix the stuck email back to scheduled
UPDATE email_history 
SET status = 'scheduled'
WHERE id = '328f4367-fc75-45a1-8508-a995104a8fbf' AND status = 'sending';