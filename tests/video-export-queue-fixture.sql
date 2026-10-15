-- Isolated database only: a minimal fixture for testing the migration independently of app history.
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA storage;
CREATE TABLE storage.buckets(id text PRIMARY KEY, allowed_mime_types text[]);
INSERT INTO storage.buckets VALUES ('final-videos', ARRAY['video/mp4']);
CREATE TABLE public.video_generations (
  id uuid PRIMARY KEY, user_id uuid, status text, video_url text, thumbnail_url text,
  generation_time_seconds integer, metadata jsonb, created_at timestamptz DEFAULT now()
);
CREATE TABLE public.video_story_scenes(id uuid PRIMARY KEY);
