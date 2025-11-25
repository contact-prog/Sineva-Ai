-- Add conversation summary and related conversations support
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS conversation_summary TEXT,
ADD COLUMN IF NOT EXISTS related_conversations JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_summary_at TIMESTAMP WITH TIME ZONE;

-- Create index for related conversations
CREATE INDEX IF NOT EXISTS idx_conversations_related ON public.conversations USING gin(related_conversations);

-- Add comment
COMMENT ON COLUMN public.conversations.conversation_summary IS 'AI-generated summary of conversation for context compression';
COMMENT ON COLUMN public.conversations.related_conversations IS 'Array of related conversation IDs with relevance scores';
COMMENT ON COLUMN public.conversations.message_count IS 'Total number of messages in conversation';
COMMENT ON COLUMN public.conversations.last_summary_at IS 'Timestamp of last summary generation';