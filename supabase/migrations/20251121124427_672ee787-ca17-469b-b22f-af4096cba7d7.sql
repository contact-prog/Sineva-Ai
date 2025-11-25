-- Add automation tracking columns to video_generations table
ALTER TABLE video_generations
ADD COLUMN IF NOT EXISTS is_automated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS user_prompt TEXT,
ADD COLUMN IF NOT EXISTS extracted_info JSONB,
ADD COLUMN IF NOT EXISTS inferred_settings JSONB;

-- Create index for efficient querying of automated videos
CREATE INDEX IF NOT EXISTS idx_video_generations_automated 
ON video_generations(user_id, is_automated, created_at DESC);

-- Add comment for documentation
COMMENT ON COLUMN video_generations.is_automated IS 'Whether this video was generated via automated chat workflow';
COMMENT ON COLUMN video_generations.user_prompt IS 'Original natural language prompt from user';
COMMENT ON COLUMN video_generations.extracted_info IS 'AI-extracted parameters from user prompt';
COMMENT ON COLUMN video_generations.inferred_settings IS 'Automatically inferred settings (style, platforms, etc.)';