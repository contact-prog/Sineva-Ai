-- Add auto-reply tracking columns to email_history
ALTER TABLE email_history 
ADD COLUMN IF NOT EXISTS auto_reply_done BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_auto_reply BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS replied_to_email_id UUID REFERENCES email_history(id);

-- Create index for faster auto-reply lookups
CREATE INDEX IF NOT EXISTS idx_email_history_auto_reply ON email_history(provider_message_id, auto_reply_done) WHERE direction = 'received';

-- Create user settings table for auto-reply toggle
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  auto_reply_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_settings
CREATE POLICY "Users can view their own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();