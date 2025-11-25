-- Add model tracking columns to graphic_generations
ALTER TABLE graphic_generations 
ADD COLUMN IF NOT EXISTS model_family TEXT,
ADD COLUMN IF NOT EXISTS model_version TEXT,
ADD COLUMN IF NOT EXISTS model_reason TEXT,
ADD COLUMN IF NOT EXISTS generation_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS cost_estimate DECIMAL(10, 4);

-- Create AI model usage tracking table
CREATE TABLE IF NOT EXISTS ai_model_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Service info
  service TEXT NOT NULL,
  operation TEXT NOT NULL,
  
  -- Model info
  model_family TEXT NOT NULL,
  model_version TEXT NOT NULL,
  selection_reason TEXT,
  
  -- Usage metrics
  input_tokens INTEGER,
  output_tokens INTEGER,
  generation_time_ms INTEGER,
  cost_estimate DECIMAL(10, 4),
  
  -- Status
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  
  -- Metadata
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE ai_model_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own model usage"
  ON ai_model_usage
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert model usage"
  ON ai_model_usage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_model_usage_user_service 
  ON ai_model_usage(user_id, service, created_at DESC);
  
CREATE INDEX IF NOT EXISTS idx_ai_model_usage_model 
  ON ai_model_usage(model_family, model_version, created_at DESC);

-- Add comments
COMMENT ON TABLE ai_model_usage IS 'Tracks usage of AI models across all services for analytics and cost monitoring';
COMMENT ON COLUMN ai_model_usage.service IS 'Service type: chat, image-generation, image-editing, video, content';
COMMENT ON COLUMN ai_model_usage.operation IS 'Operation type: generate, edit, chat, analyze';
COMMENT ON COLUMN ai_model_usage.model_family IS 'Model family: gemini, imagen, runway, etc';
COMMENT ON COLUMN ai_model_usage.model_version IS 'Specific model version: gemini-3.0-pro, imagen-4, etc';