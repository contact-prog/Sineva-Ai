-- Create scraping_jobs table for progress tracking
CREATE TABLE IF NOT EXISTS public.scraping_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  website_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  progress_percentage INTEGER NOT NULL DEFAULT 0,
  current_step TEXT,
  results JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scraping_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for dev mode)
CREATE POLICY "Anyone can insert scraping jobs"
  ON public.scraping_jobs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view scraping jobs"
  ON public.scraping_jobs FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update scraping jobs"
  ON public.scraping_jobs FOR UPDATE
  USING (true);

-- Index for faster queries
CREATE INDEX idx_scraping_jobs_user_id ON public.scraping_jobs(user_id);
CREATE INDEX idx_scraping_jobs_status ON public.scraping_jobs(status);
CREATE INDEX idx_scraping_jobs_created_at ON public.scraping_jobs(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_scraping_jobs_updated_at
  BEFORE UPDATE ON public.scraping_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for progress updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.scraping_jobs;