-- Update the check constraint to include VEO 3.1 generation modes
ALTER TABLE video_generations 
DROP CONSTRAINT IF EXISTS video_generations_generation_mode_check;

ALTER TABLE video_generations
ADD CONSTRAINT video_generations_generation_mode_check 
CHECK (generation_mode = ANY (ARRAY[
  'quick',
  'story',
  'text-to-video',
  'image-to-video',
  'frames-to-video',
  'scene-extension',
  'ingredients-to-video',
  'template',
  'platform',
  'product',
  'brand'
]::text[]));