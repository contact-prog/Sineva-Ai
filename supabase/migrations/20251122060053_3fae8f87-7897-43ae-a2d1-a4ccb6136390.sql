-- Phase 2: Content Variations table for storing multiple content versions
-- Allows users to generate and compare different versions of content

CREATE TABLE IF NOT EXISTS content_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_content_id UUID REFERENCES content_history(id) ON DELETE CASCADE,
  variation_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  tone TEXT,
  framework TEXT,
  engagement_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for content_variations
ALTER TABLE content_variations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view variations of their own content"
  ON content_variations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM content_history
      WHERE content_history.id = content_variations.parent_content_id
      AND content_history.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert variations for their own content"
  ON content_variations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM content_history
      WHERE content_history.id = content_variations.parent_content_id
      AND content_history.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete variations of their own content"
  ON content_variations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM content_history
      WHERE content_history.id = content_variations.parent_content_id
      AND content_history.user_id = auth.uid()
    )
  );

-- Add indexes for better performance
CREATE INDEX idx_content_variations_parent 
ON content_variations(parent_content_id);

CREATE INDEX idx_content_variations_created_at 
ON content_variations(created_at DESC);

-- Add SEO score column to content_history for blog posts
ALTER TABLE content_history 
ADD COLUMN IF NOT EXISTS seo_score JSONB;

COMMENT ON COLUMN content_history.seo_score IS 'SEO analysis results for blog posts including meta tags, readability, keyword density';

-- Add quality metrics column for future use
ALTER TABLE content_history 
ADD COLUMN IF NOT EXISTS quality_metrics JSONB;

COMMENT ON COLUMN content_history.quality_metrics IS 'Quality assessment metrics like brand voice consistency, grammar score, engagement prediction';