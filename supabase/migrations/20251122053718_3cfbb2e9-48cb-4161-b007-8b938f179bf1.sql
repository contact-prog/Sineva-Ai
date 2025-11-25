-- Create workflow tracking tables
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  conversation_id UUID REFERENCES conversations(id),
  original_prompt TEXT NOT NULL,
  workflow_type TEXT NOT NULL, -- 'simple' | 'workflow' | 'research'
  status TEXT NOT NULL DEFAULT 'planning', -- 'planning' | 'executing' | 'completed' | 'failed'
  plan JSONB, -- WorkflowPlan object
  results JSONB, -- Results from each step
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE TABLE workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE,
  step_number INT NOT NULL,
  agent TEXT NOT NULL, -- 'research' | 'graphics' | 'video' | 'content' | 'social' | 'email' | 'calendar'
  action TEXT NOT NULL,
  purpose TEXT,
  status TEXT DEFAULT 'pending', -- 'pending' | 'executing' | 'completed' | 'failed'
  parameters JSONB,
  result JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

-- Create indexes for performance
CREATE INDEX idx_workflow_executions_user ON workflow_executions(user_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_workflow_executions_conversation ON workflow_executions(conversation_id);
CREATE INDEX idx_workflow_steps_workflow ON workflow_steps(workflow_id);
CREATE INDEX idx_workflow_steps_status ON workflow_steps(status);

-- Enable Row Level Security
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workflow_executions
CREATE POLICY "Users can view their own workflows"
  ON workflow_executions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workflows"
  ON workflow_executions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workflows"
  ON workflow_executions FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for workflow_steps
CREATE POLICY "Users can view their own workflow steps"
  ON workflow_steps FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workflow_executions
    WHERE id = workflow_steps.workflow_id
    AND user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own workflow steps"
  ON workflow_steps FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM workflow_executions
    WHERE id = workflow_steps.workflow_id
    AND user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own workflow steps"
  ON workflow_steps FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM workflow_executions
    WHERE id = workflow_steps.workflow_id
    AND user_id = auth.uid()
  ));