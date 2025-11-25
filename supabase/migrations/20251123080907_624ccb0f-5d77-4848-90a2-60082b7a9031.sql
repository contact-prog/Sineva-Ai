-- Enable realtime for gallery tables so they update automatically

-- Enable replica identity for video_generations
ALTER TABLE public.video_generations REPLICA IDENTITY FULL;

-- Enable replica identity for graphic_generations  
ALTER TABLE public.graphic_generations REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_generations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.graphic_generations;