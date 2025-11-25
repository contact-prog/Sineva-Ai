-- Add RLS policy for deleting chat messages
CREATE POLICY "Users can delete messages in their conversations"
ON chat_messages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = chat_messages.conversation_id
    AND conversations.user_id = auth.uid()
  )
);

-- Add archived status to conversations
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

-- Add index for better performance on archived conversations
CREATE INDEX IF NOT EXISTS idx_conversations_archived ON conversations(user_id, archived, updated_at DESC);

-- Add foreign key constraint with cascade delete for chat_messages
-- First, check if constraint exists and drop it if needed
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chat_messages_conversation_id_fkey'
  ) THEN
    ALTER TABLE chat_messages DROP CONSTRAINT chat_messages_conversation_id_fkey;
  END IF;
END $$;

-- Add the constraint with CASCADE
ALTER TABLE chat_messages
ADD CONSTRAINT chat_messages_conversation_id_fkey
FOREIGN KEY (conversation_id)
REFERENCES conversations(id)
ON DELETE CASCADE;

-- Add conversation metadata for export timestamps
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS last_exported_at TIMESTAMP WITH TIME ZONE;