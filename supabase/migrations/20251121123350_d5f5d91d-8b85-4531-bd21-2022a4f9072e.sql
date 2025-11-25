-- Create storage buckets for video clips and final videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('video-clips', 'video-clips', true, 104857600, ARRAY['video/mp4', 'video/quicktime']),
  ('final-videos', 'final-videos', true, 209715200, ARRAY['video/mp4', 'video/quicktime'])
ON CONFLICT (id) DO NOTHING;

-- RLS policies for video-clips bucket
CREATE POLICY "Users can upload their own video clips"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'video-clips' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own video clips"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'video-clips' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public can view video clips"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'video-clips');

-- RLS policies for final-videos bucket
CREATE POLICY "Users can upload their own final videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'final-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own final videos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'final-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public can view final videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'final-videos');

-- Add new columns to video_generations table
ALTER TABLE video_generations 
ADD COLUMN IF NOT EXISTS video_quality TEXT,
ADD COLUMN IF NOT EXISTS veo_model_used TEXT,
ADD COLUMN IF NOT EXISTS generation_time_seconds INTEGER,
ADD COLUMN IF NOT EXISTS intermediate_clips_urls TEXT[];