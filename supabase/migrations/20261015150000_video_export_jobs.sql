-- Fields already written by the staged clip/audio endpoints, absent from older migrations.
ALTER TABLE public.video_generations
  ADD COLUMN IF NOT EXISTS voiceover_url text,
  ADD COLUMN IF NOT EXISTS music_url text,
  ADD COLUMN IF NOT EXISTS audio_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS images_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS videos_approved_at timestamptz;
ALTER TABLE public.video_story_scenes
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS video_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS veo_model_used text,
  ADD COLUMN IF NOT EXISTS generation_cost numeric;
ALTER TABLE public.video_generations ADD COLUMN IF NOT EXISTS platform_urls jsonb;
-- Durable jobs are service-role only. Users poll via the ownership-checked Edge function.
CREATE TABLE public.video_export_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_generation_id uuid NOT NULL REFERENCES public.video_generations(id) ON DELETE CASCADE,
  input jsonb NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed')),
  attempts integer NOT NULL DEFAULT 0,
  lease_token uuid,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  result jsonb,
  error text
);
ALTER TABLE public.video_export_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.video_export_jobs FROM anon, authenticated;
GRANT ALL ON public.video_export_jobs TO service_role;
CREATE UNIQUE INDEX video_export_one_active ON public.video_export_jobs(video_generation_id)
  WHERE status IN ('queued','running');

CREATE FUNCTION public.enqueue_video_export(generation_id uuid, export_input jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE job_id uuid;
BEGIN
  PERFORM 1 FROM video_generations WHERE id = generation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Video not found'; END IF;
  SELECT id INTO job_id FROM video_export_jobs WHERE video_generation_id = generation_id AND status IN ('queued','running');
  IF job_id IS NULL THEN
    INSERT INTO video_export_jobs(video_generation_id,input) VALUES (generation_id,export_input) RETURNING id INTO job_id;
    UPDATE video_generations SET status = 'assembling' WHERE id = generation_id;
  END IF;
  RETURN job_id;
END $$;

CREATE FUNCTION public.claim_video_export()
RETURNS SETOF public.video_export_jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- A killed container's lease expires. Limit retries and release permanently stuck videos.
  WITH expired AS (
    UPDATE video_export_jobs SET status = 'failed', error = 'Export worker lease expired'
    WHERE status = 'running' AND claimed_at < now() - interval '20 minutes' AND attempts >= 3
    RETURNING video_generation_id
  ) UPDATE video_generations SET status = 'failed' WHERE id IN (SELECT video_generation_id FROM expired);
  RETURN QUERY
    UPDATE video_export_jobs SET status = 'running', claimed_at = now(), attempts = attempts + 1, lease_token = gen_random_uuid()
    WHERE id = (SELECT id FROM video_export_jobs
      WHERE status = 'queued' OR (status = 'running' AND claimed_at < now() - interval '20 minutes' AND attempts < 3)
      ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1)
    RETURNING *;
END $$;

CREATE FUNCTION public.finish_video_export(job_id uuid, token uuid, videos jsonb, failure text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE generation_id uuid; urls jsonb;
BEGIN
  UPDATE video_export_jobs SET status = CASE WHEN failure IS NULL THEN 'completed' ELSE 'failed' END,
    result = videos, error = failure
  WHERE id = job_id AND lease_token = token AND status = 'running'
  RETURNING video_generation_id INTO generation_id;
  IF generation_id IS NULL THEN RETURN false; END IF;
  IF failure IS NULL THEN
    SELECT jsonb_object_agg(v->>'platform',v->>'url') INTO urls FROM jsonb_array_elements(videos) v;
    UPDATE video_generations SET status = 'completed', platform_urls = urls,
      video_url = videos->0->>'url', thumbnail_url = videos->0->>'thumbnailUrl',
      generation_time_seconds = extract(epoch FROM now() - created_at)::integer,
      metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object('stage','completed','finalVideos',videos)
    WHERE id = generation_id;
  ELSE
    UPDATE video_generations SET status = 'failed',
      metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object('assemblyError',failure)
    WHERE id = generation_id;
  END IF;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.enqueue_video_export(uuid,jsonb), public.claim_video_export(), public.finish_video_export(uuid,uuid,jsonb,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_video_export(uuid,jsonb), public.claim_video_export(), public.finish_video_export(uuid,uuid,jsonb,text) TO service_role;
-- The existing public final-videos bucket already stores MP4s; thumbnails share it.
UPDATE storage.buckets SET allowed_mime_types = array['video/mp4','video/quicktime','image/jpeg'] WHERE id = 'final-videos';
