-- Create video_generations table
CREATE TABLE IF NOT EXISTS video_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generation_mode TEXT CHECK (generation_mode IN (
    'quick', 'story', 'image-to-video', 'template', 'platform', 'product', 'brand'
  )),
  prompt TEXT NOT NULL,
  style TEXT,
  duration_seconds INTEGER,
  platforms TEXT[],
  video_url TEXT,
  thumbnail_url TEXT,
  status TEXT DEFAULT 'generating',
  cost_usd DECIMAL(10,4),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on video_generations
ALTER TABLE video_generations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_generations
CREATE POLICY "Users can view their own video generations"
  ON video_generations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own video generations"
  ON video_generations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own video generations"
  ON video_generations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own video generations"
  ON video_generations FOR DELETE
  USING (auth.uid() = user_id);

-- Create video_story_scenes table (for story mode)
CREATE TABLE IF NOT EXISTS video_story_scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_generation_id UUID NOT NULL REFERENCES video_generations(id) ON DELETE CASCADE,
  scene_number INTEGER NOT NULL,
  duration_seconds INTEGER,
  visual_description TEXT,
  narration TEXT,
  mood TEXT,
  image_url TEXT,
  video_clip_url TEXT,
  start_time_ms INTEGER,
  end_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on video_story_scenes
ALTER TABLE video_story_scenes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_story_scenes
CREATE POLICY "Users can view scenes from their own videos"
  ON video_story_scenes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM video_generations
      WHERE video_generations.id = video_story_scenes.video_generation_id
      AND video_generations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create scenes for their own videos"
  ON video_story_scenes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM video_generations
      WHERE video_generations.id = video_story_scenes.video_generation_id
      AND video_generations.user_id = auth.uid()
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_video_generations_updated_at
  BEFORE UPDATE ON video_generations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();