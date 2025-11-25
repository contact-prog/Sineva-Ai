-- Enable realtime for email_history table
ALTER TABLE email_history REPLICA IDENTITY FULL;

-- Add email_history to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE email_history;