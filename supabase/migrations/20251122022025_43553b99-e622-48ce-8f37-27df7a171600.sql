-- Add VEO 3.1 support columns to video_generations table
ALTER TABLE video_generations
ADD COLUMN IF NOT EXISTS generation_mode TEXT DEFAULT 'text-to-video',
ADD COLUMN IF NOT EXISTS resolution TEXT DEFAULT '720p',
ADD COLUMN IF NOT EXISTS include_audio BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS reference_image_url TEXT,
ADD COLUMN IF NOT EXISTS reference_images_urls TEXT[],
ADD COLUMN IF NOT EXISTS first_frame_url TEXT,
ADD COLUMN IF NOT EXISTS last_frame_url TEXT,
ADD COLUMN IF NOT EXISTS base_video_url TEXT,
ADD COLUMN IF NOT EXISTS is_extension BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS original_video_id UUID REFERENCES video_generations(id),
ADD COLUMN IF NOT EXISTS extension_count INTEGER DEFAULT 0;

-- Create index for efficient gallery queries
CREATE INDEX IF NOT EXISTS idx_video_generations_completed 
ON video_generations(user_id, status) 
WHERE status = 'completed';

-- Create index for extension tracking
CREATE INDEX IF NOT EXISTS idx_video_generations_extensions
ON video_generations(original_video_id)
WHERE is_extension = true;

-- Add comment for documentation
COMMENT ON COLUMN video_generations.generation_mode IS 'VEO 3.1 generation mode: text-to-video, image-to-video, frames-to-video, scene-extension, ingredients-to-video';
COMMENT ON COLUMN video_generations.resolution IS 'Video resolution: 720p or 1080p (VEO 3.1 supported)';
COMMENT ON COLUMN video_generations.include_audio IS 'Whether to generate native audio with VEO 3.1';
COMMENT ON COLUMN video_generations.is_extension IS 'Whether this video is an extension of another video';
COMMENT ON COLUMN video_generations.original_video_id IS 'Reference to the original video if this is an extension';
COMMENT ON COLUMN video_generations.extension_count IS 'Number of times this video has been extended';