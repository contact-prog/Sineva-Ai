import { CheckCircle2, Loader2, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  message?: string;
}

interface ProgressIndicatorProps {
  steps: ProgressStep[];
  className?: string;
}

export function ProgressIndicator({ steps, className }: ProgressIndicatorProps) {
  return (
    <div className={cn("bg-card border border-border/50 rounded-2xl p-4 space-y-3", className)}>
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-start gap-3">
          {/* Status Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {step.status === 'complete' && (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )}
            {step.status === 'active' && (
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
            )}
            {step.status === 'pending' && (
              <Clock className="h-5 w-5 text-muted-foreground/50" />
            )}
            {step.status === 'error' && (
              <AlertCircle className="h-5 w-5 text-destructive" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-sm font-medium",
              step.status === 'complete' && "text-green-500",
              step.status === 'active' && "text-foreground",
              step.status === 'pending' && "text-muted-foreground",
              step.status === 'error' && "text-destructive"
            )}>
              {step.label}
            </p>
            {step.message && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {step.message}
              </p>
            )}
          </div>

          {/* Connector Line */}
          {index < steps.length - 1 && (
            <div className="absolute left-[22px] top-8 w-0.5 h-6 bg-border/30" 
                 style={{ marginLeft: '-11px', marginTop: '8px' }} 
            />
          )}
        </div>
      ))}
    </div>
  );
}

// Hook to generate progress steps from tool calls
export function useProgressSteps(toolCalls: any[], isLoading: boolean) {
  if (!isLoading && (!toolCalls || toolCalls.length === 0)) {
    return null;
  }

  const steps: ProgressStep[] = toolCalls.map((toolCall, index) => ({
    id: toolCall.id || `step-${index}`,
    label: formatToolLabel(toolCall.name || toolCall.function?.name || 'Processing'),
    status: 'complete' as const,
    message: toolCall.error ? 'Failed' : 'Done'
  }));

  // Add current processing step if loading
  if (isLoading) {
    steps.push({
      id: 'current',
      label: 'Generating response',
      status: 'active',
      message: 'Please wait...'
    });
  }

  return steps;
}

function formatToolLabel(toolName: string): string {
  const toolMap: Record<string, string> = {
    'update_brand_kit': 'Updating Brand Kit',
    'generate_graphic_preview': 'Generating Graphic Preview',
    'edit_graphic': 'Editing Graphic',
    'approve_and_generate_batch': 'Creating Graphics',
    'generate_content': 'Writing Content',
    'generate_video_story': 'Creating Video Story',
    'schedule_social_post': 'Scheduling Post',
    'send_email': 'Sending Email',
    'get_social_accounts': 'Checking Accounts',
    'generate_platform_suite': 'Creating Multi-Platform Content',
  };
  
  return toolMap[toolName] || toolName.split('_').map(w => 
    w.charAt(0).toUpperCase() + w.slice(1)
  ).join(' ');
}
