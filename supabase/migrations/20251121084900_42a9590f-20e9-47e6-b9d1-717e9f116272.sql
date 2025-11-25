-- Create graphic_generations table for AI-generated graphics
CREATE TABLE IF NOT EXISTS public.graphic_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Generation details
  platform TEXT NOT NULL,
  content_type TEXT NOT NULL,
  category TEXT,
  prompt TEXT NOT NULL,
  enhanced_prompt TEXT,
  
  -- Output
  image_url TEXT NOT NULL,
  dimensions TEXT NOT NULL,
  
  -- AI Model info
  model_used TEXT NOT NULL,
  api_reason TEXT,
  
  -- Preview & Batch workflow
  is_preview BOOLEAN DEFAULT FALSE,
  parent_preview_id UUID REFERENCES public.graphic_generations(id) ON DELETE CASCADE,
  
  -- Logo integration
  logo_included BOOLEAN DEFAULT FALSE,
  logo_config JSONB,
  
  -- Additional metadata
  parameters JSONB,
  generation_mode TEXT DEFAULT 'text-to-image',
  reference_image_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.graphic_generations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own generations"
  ON public.graphic_generations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own generations"
  ON public.graphic_generations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generations"
  ON public.graphic_generations
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generations"
  ON public.graphic_generations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_graphic_generations_user_id ON public.graphic_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_graphic_generations_preview ON public.graphic_generations(user_id, is_preview);
CREATE INDEX IF NOT EXISTS idx_graphic_generations_parent ON public.graphic_generations(parent_preview_id);
CREATE INDEX IF NOT EXISTS idx_graphic_generations_created_at ON public.graphic_generations(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_graphic_generations_updated_at
  BEFORE UPDATE ON public.graphic_generations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();