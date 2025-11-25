-- Create social-media storage bucket for uploaded media
INSERT INTO storage.buckets (id, name, public)
VALUES ('social-media', 'social-media', true);

-- RLS Policies for social-media bucket
CREATE POLICY "Users can upload their own media"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'social-media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own media"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'social-media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own media"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'social-media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own media"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'social-media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Public can view social media content"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'social-media');