-- Drop foreign key constraint on graphic_generations.user_id
-- This allows anonymous/development usage without requiring auth.users records
ALTER TABLE public.graphic_generations 
DROP CONSTRAINT IF EXISTS graphic_generations_user_id_fkey;

-- Also drop similar constraints on other user-facing tables for dev mode
ALTER TABLE public.video_generations 
DROP CONSTRAINT IF EXISTS video_generations_user_id_fkey;

ALTER TABLE public.content_history 
DROP CONSTRAINT IF EXISTS content_history_user_id_fkey;

ALTER TABLE public.videos 
DROP CONSTRAINT IF EXISTS videos_user_id_fkey;
