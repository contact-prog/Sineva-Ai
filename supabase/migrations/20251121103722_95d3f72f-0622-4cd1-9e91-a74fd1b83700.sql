-- Add workflow_state column to conversations table for persisting active workflows
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS workflow_state jsonb DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.conversations.workflow_state IS 'Stores the current active workflow state (service type, stage, config, results) as JSON';
