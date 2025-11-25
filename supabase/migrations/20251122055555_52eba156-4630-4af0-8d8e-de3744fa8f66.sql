-- Enhanced content_history table for Phase 1 Content Generator features
-- Adds columns for research insights, template usage, and future repurposing features

-- Add new columns to content_history table
ALTER TABLE content_history 
ADD COLUMN IF NOT EXISTS research_insights JSONB,
ADD COLUMN IF NOT EXISTS template_used TEXT,
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS template_name TEXT;

-- Add comment to describe new columns
COMMENT ON COLUMN content_history.research_insights IS 'Research data used to inform content generation';
COMMENT ON COLUMN content_history.template_used IS 'Copywriting framework used (aida, pas, fab, etc.)';
COMMENT ON COLUMN content_history.is_template IS 'Whether this content is saved as a reusable template';
COMMENT ON COLUMN content_history.template_name IS 'Name of the template if is_template is true';

-- Create index for template lookups
CREATE INDEX IF NOT EXISTS idx_content_history_templates 
ON content_history(user_id, is_template) 
WHERE is_template = TRUE;

-- Create index for template framework
CREATE INDEX IF NOT EXISTS idx_content_history_framework 
ON content_history(template_used) 
WHERE template_used IS NOT NULL;