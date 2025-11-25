-- Create user_memory table for storing long-term AI memory
CREATE TABLE public.user_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  memory_type text NOT NULL, -- 'preference', 'pattern', 'workflow', 'brand_context'
  category text, -- 'content', 'graphics', 'video', 'social', 'general'
  key text NOT NULL, -- e.g., 'preferred_tone', 'successful_platforms', 'posting_schedule'
  value jsonb NOT NULL,
  confidence_score numeric DEFAULT 1.0, -- How confident we are in this memory (0-1)
  usage_count integer DEFAULT 1, -- How many times this preference was observed
  last_used_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create index for fast lookups
CREATE INDEX idx_user_memory_user_id ON public.user_memory(user_id);
CREATE INDEX idx_user_memory_type ON public.user_memory(user_id, memory_type);
CREATE INDEX idx_user_memory_category ON public.user_memory(user_id, category);
CREATE UNIQUE INDEX idx_user_memory_unique_key ON public.user_memory(user_id, memory_type, category, key);

-- Enable RLS
ALTER TABLE public.user_memory ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own memory"
  ON public.user_memory
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memory"
  ON public.user_memory
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memory"
  ON public.user_memory
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memory"
  ON public.user_memory
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_memory_updated_at
  BEFORE UPDATE ON public.user_memory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add memory summary to conversations table for quick access
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS memory_snapshot jsonb DEFAULT NULL;

COMMENT ON COLUMN public.conversations.memory_snapshot IS 'Snapshot of relevant user memory at conversation start';

-- Create function to build memory context for AI
CREATE OR REPLACE FUNCTION public.get_user_memory_context(p_user_id uuid, p_category text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  memory_context jsonb;
BEGIN
  -- Build comprehensive memory context
  SELECT jsonb_build_object(
    'preferences', (
      SELECT jsonb_object_agg(key, value)
      FROM user_memory
      WHERE user_id = p_user_id 
        AND memory_type = 'preference'
        AND (p_category IS NULL OR category = p_category)
        AND confidence_score > 0.5
    ),
    'patterns', (
      SELECT jsonb_object_agg(key, value)
      FROM user_memory
      WHERE user_id = p_user_id 
        AND memory_type = 'pattern'
        AND (p_category IS NULL OR category = p_category)
        AND confidence_score > 0.6
      ORDER BY confidence_score DESC, usage_count DESC
      LIMIT 10
    ),
    'successful_workflows', (
      SELECT jsonb_agg(value ORDER BY confidence_score DESC)
      FROM user_memory
      WHERE user_id = p_user_id 
        AND memory_type = 'workflow'
        AND confidence_score > 0.7
      LIMIT 5
    ),
    'brand_context', (
      SELECT jsonb_object_agg(key, value)
      FROM user_memory
      WHERE user_id = p_user_id 
        AND memory_type = 'brand_context'
    )
  ) INTO memory_context;
  
  RETURN COALESCE(memory_context, '{}'::jsonb);
END;
$$;