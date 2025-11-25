-- Add quality preference and reference image support to video_generations table
ALTER TABLE video_generations
ADD COLUMN quality_preference text DEFAULT 'fast' CHECK (quality_preference IN ('fast', 'premium')),
ADD COLUMN reference_image_url text;

-- Add comment for documentation
COMMENT ON COLUMN video_generations.quality_preference IS 'Fast mode uses veo-3.1-fast-generate-001 ($0.04/5s), Premium uses veo-3.1-generate-001 ($0.12/5s)';
COMMENT ON COLUMN video_generations.reference_image_url IS 'Optional character/product image for image-to-video generation using veo-3.1-generate-preview';