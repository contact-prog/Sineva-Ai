import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  Search, 
  Image, 
  Video, 
  FileText, 
  Send, 
  Mail, 
  Calendar,
  CheckCircle2,
  Loader2,
  Clock,
  AlertCircle,
  Pause,
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WorkflowStep {
  stepNumber: number;
  agent: string;
  action: string;
  purpose: string;
  parameters: any;
  dependsOn?: number[];
  canRunInParallel: boolean;
}

interface WorkflowPlan {
  id: string;
  originalPrompt: string;
  goal: string;
  researchRequired: boolean;
  steps: WorkflowStep[];
  estimatedDuration: number;
  complexity: 'simple' | 'moderate' | 'complex';
}

interface WorkflowProgressTrackerProps {
  workflow: WorkflowPlan;
  currentStep: number;
  stepResults: Record<number, any>;
  errors?: Record<number, string>;
  status?: 'running' | 'completed' | 'failed' | 'paused';
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
}

const agentIcons: Record<string, any> = {
  research: Search,
  graphics: Image,
  video: Video,
  content: FileText,
  social: Send,
  email: Mail,
  calendar: Calendar
};

const agentColors: Record<string, string> = {
  research: 'text-blue-500',
  graphics: 'text-purple-500',
  video: 'text-pink-500',
  content: 'text-green-500',
  social: 'text-orange-500',
  email: 'text-cyan-500',
  calendar: 'text-indigo-500'
};

function WorkflowStepItem({ 
  step, 
  isActive, 
  isCompleted,
  isFailed,
  result,
  error
}: { 
  step: WorkflowStep; 
  isActive: boolean; 
  isCompleted: boolean;
  isFailed: boolean;
  result?: any;
  error?: string;
}) {
  const Icon = agentIcons[step.agent] || Brain;
  const colorClass = agentColors[step.agent] || 'text-primary';

  return (
    <div className={cn(
      "flex items-start gap-3 p-3 rounded-lg border transition-all",
      isActive && "border-primary bg-primary/5",
      isCompleted && "border-muted bg-muted/30",
      isFailed && "border-destructive bg-destructive/5",
      !isActive && !isCompleted && !isFailed && "border-border/50 opacity-60"
    )}>
      {/* Status Indicator */}
      <div className="flex-shrink-0 mt-1">
        {isFailed ? (
          <AlertCircle className="h-5 w-5 text-destructive" />
        ) : isCompleted ? (
          <CheckCircle2 className="h-5 w-5 text-primary" />
        ) : isActive ? (
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
        ) : (
          <Clock className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      {/* Step Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={cn("h-4 w-4", colorClass)} />
          <span className="text-sm font-medium capitalize">{step.agent} Agent</span>
          <Badge variant="outline" className="text-xs">
            Step {step.stepNumber}
          </Badge>
          {step.canRunInParallel && (
            <Badge variant="secondary" className="text-xs">
              Parallel
            </Badge>
          )}
        </div>
        
        <p className="text-sm text-muted-foreground">{step.purpose}</p>
        
        {/* Show result if completed */}
        {isCompleted && result && (
          <div className="mt-2 text-xs text-primary">
            ✓ Completed successfully
          </div>
        )}
        
        {/* Show error if failed */}
        {isFailed && error && (
          <div className="mt-2 text-xs text-destructive">
            ✗ {error}
          </div>
        )}
      </div>
    </div>
  );
}

export function WorkflowProgressTracker({ 
  workflow, 
  currentStep, 
  stepResults,
  errors = {},
  status = 'running',
  onPause,
  onResume,
  onCancel
}: WorkflowProgressTrackerProps) {
  const completedCount = Object.keys(stepResults).length;
  const errorCount = Object.keys(errors).length;
  const progressPercentage = (completedCount / workflow.steps.length) * 100;

  const getStatusColor = () => {
    switch (status) {
      case 'completed': return 'border-green-500';
      case 'failed': return 'border-destructive';
      case 'paused': return 'border-yellow-500';
      default: return 'border-primary/30';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed': return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'paused': return <Pause className="h-5 w-5 text-yellow-500" />;
      default: return <Brain className="h-5 w-5 text-primary animate-pulse" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'completed': return 'Workflow Completed';
      case 'failed': return 'Workflow Failed';
      case 'paused': return 'Workflow Paused';
      default: return 'Executing Multi-Agent Workflow';
    }
  };

  return (
    <Card className={cn("p-4 bg-gradient-to-br from-primary/5 to-secondary/5", getStatusColor())}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            {getStatusIcon()}
          </div>
          <div>
            <h4 className="font-semibold">{getStatusText()}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {completedCount} of {workflow.steps.length} steps completed
              {errorCount > 0 && ` • ${errorCount} errors`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline"
            className={cn(
              workflow.complexity === 'simple' && 'border-green-500 text-green-500',
              workflow.complexity === 'moderate' && 'border-yellow-500 text-yellow-500',
              workflow.complexity === 'complex' && 'border-red-500 text-red-500'
            )}
          >
            {workflow.complexity}
          </Badge>
          
          {/* Control Buttons */}
          {status === 'running' && onPause && (
            <Button size="sm" variant="outline" onClick={onPause}>
              <Pause className="h-4 w-4" />
            </Button>
          )}
          {status === 'paused' && onResume && (
            <Button size="sm" variant="outline" onClick={onResume}>
              <Play className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Goal */}
      <div className="mb-4 p-3 rounded-lg bg-card border border-border/50">
        <p className="text-sm font-medium mb-1">Workflow Goal</p>
        <p className="text-sm text-muted-foreground">{workflow.goal}</p>
      </div>

      {/* Steps */}
      <div className="space-y-2 mb-4">
        {workflow.steps.map((step) => (
          <WorkflowStepItem
            key={step.stepNumber}
            step={step}
            isActive={currentStep === step.stepNumber && status === 'running'}
            isCompleted={stepResults[step.stepNumber] !== undefined}
            isFailed={errors[step.stepNumber] !== undefined}
            result={stepResults[step.stepNumber]}
            error={errors[step.stepNumber]}
          />
        ))}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Overall Progress</span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
        <Progress 
          value={progressPercentage} 
          className={cn(
            "h-2",
            status === 'failed' && "bg-destructive/20",
            status === 'completed' && "bg-green-500/20"
          )} 
        />
        {status === 'running' && (
          <p className="text-xs text-muted-foreground text-center">
            Estimated time remaining: ~{Math.round((workflow.estimatedDuration * (1 - progressPercentage / 100)) / 60)} min
          </p>
        )}
        {status === 'completed' && (
          <p className="text-xs text-green-500 text-center">
            ✓ All steps completed successfully
          </p>
        )}
        {status === 'failed' && (
          <p className="text-xs text-destructive text-center">
            ✗ Workflow failed - see error details above
          </p>
        )}
      </div>
    </Card>
  );
}
