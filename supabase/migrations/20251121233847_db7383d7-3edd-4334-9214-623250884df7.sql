-- Allow users to update video story scenes for editing
CREATE POLICY "Users can update scenes for their own videos"
ON video_story_scenes
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM video_generations
    WHERE video_generations.id = video_story_scenes.video_generation_id
    AND video_generations.user_id = auth.uid()
  )
);