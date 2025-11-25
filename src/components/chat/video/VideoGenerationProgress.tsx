import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Loader2, Image, Film, Wand2, Sparkles, XCircle, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface VideoGenerationProgressProps {
  videoId: string;
  status?: string;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
}

interface ProgressStep {
  key: string;
  label: string;
  icon: React.ElementType;
}

const GENERATION_STEPS: ProgressStep[] = [
  { key: 'generating', label: 'Generating video with VEO 3.1', icon: Film },
  { key: 'processing', label: 'Processing video', icon: Wand2 },
  { key: 'finalizing', label: 'Finalizing', icon: Sparkles },
];

export default function VideoGenerationProgress({ 
  videoId, 
  status: initialStatus,
  onComplete,
  onError 
}: VideoGenerationProgressProps) {
  const [status, setStatus] = useState(initialStatus || 'generating');
  const [progress, setProgress] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    let timeInterval: NodeJS.Timeout;

    const pollStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('check-video-status', {
          body: { videoId }
        });

        if (error) throw error;

        console.log('[Real Video Status]', data.status);
        setStatus(data.status);
        setElapsedSeconds(data.elapsedSeconds || 0);

        if (data.status === 'completed') {
          setProgress(100);
          clearInterval(pollInterval);
          clearInterval(timeInterval);
          onComplete?.(data);
        } else if (data.status === 'failed') {
          clearInterval(pollInterval);
          clearInterval(timeInterval);
          const error = data.error || data.metadata?.error || 'Video generation failed';
          setErrorMessage(error);
          onError?.(error);
        } else {
          // Calculate progress based on current stage
          const stepIndex = GENERATION_STEPS.findIndex(s => s.key === data.status);
          if (stepIndex >= 0) {
            const baseProgress = (stepIndex / GENERATION_STEPS.length) * 100;
            const stepProgress = 100 / GENERATION_STEPS.length;
            setProgress(Math.min(baseProgress + stepProgress * 0.5, 95)); // Cap at 95% until complete
          } else if (data.status === 'generating') {
            setProgress(10);
          }
        }
      } catch (error: any) {
        console.error('[Poll Error]', error);
        const errorMsg = error.message || 'Failed to check status';
        setErrorMessage(errorMsg);
        clearInterval(pollInterval);
        clearInterval(timeInterval);
        onError?.(errorMsg);
      }
    };

    // Start polling
    pollStatus();
    pollInterval = setInterval(pollStatus, 5000); // Poll every 5 seconds

    // Update elapsed time
    timeInterval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(timeInterval);
    };
  }, [videoId, onComplete, onError]);

  const currentStepIndex = GENERATION_STEPS.findIndex(s => s.key === status);
  const estimatedTotal = 180; // 3 minutes
  const remainingSeconds = Math.max(0, estimatedTotal - elapsedSeconds);

  // Error State
  if (errorMessage) {
    return (
      <Card className="p-6 space-y-4 bg-destructive/5 border-destructive/30">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-destructive flex items-center gap-2">
            <XCircle className="h-5 w-5" />
            Generation Failed
          </h4>
          <Badge variant="destructive">Failed</Badge>
        </div>

        <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-lg">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive mb-1">Error Details:</p>
            <p className="text-sm text-destructive/90">{errorMessage}</p>
          </div>
        </div>

        <div className="pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center">
            Video ID: {videoId.slice(0, 8)}...
          </p>
        </div>
      </Card>
    );
  }

  // Loading State
  return (
    <Card className="p-6 space-y-4 bg-card border-border/30">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Creating Your Video
        </h4>
        <Badge variant="secondary" className="gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Generating
        </Badge>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')} elapsed
          </span>
          <span className="font-medium text-primary">{Math.round(progress)}%</span>
          <span>
            ~{Math.floor(remainingSeconds / 60)}:{(remainingSeconds % 60).toString().padStart(2, '0')} left
          </span>
        </div>
      </div>

      {/* Real-time Step List */}
      <div className="space-y-2">
        {GENERATION_STEPS.map((step, index) => {
          const isCompleted = index < currentStepIndex || (currentStepIndex === -1 && status === 'completed');
          const isCurrent = index === currentStepIndex || (currentStepIndex === -1 && status === 'generating' && index === 0);
          const isUpcoming = index > currentStepIndex;

          return (
            <div
              key={step.key}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-all",
                isCurrent && "bg-primary/5 border border-primary/20 scale-105",
                isCompleted && "opacity-60"
              )}
            >
              <div className={cn(
                "flex items-center justify-center h-8 w-8 rounded-full flex-shrink-0 transition-all",
                isCompleted && "bg-green-500/20 text-green-500",
                isCurrent && "bg-primary/10 text-primary",
                isUpcoming && "bg-muted text-muted-foreground"
              )}>
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : isCurrent ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <step.icon className="h-4 w-4" />
                )}
              </div>
              
              <div className="flex-1">
                <p className={cn(
                  "text-sm font-medium transition-colors",
                  isCompleted && "text-green-600 dark:text-green-400",
                  isCurrent && "text-primary",
                  isUpcoming && "text-muted-foreground"
                )}>
                  {step.label}
                </p>
                {isCurrent && (
                  <p className="text-xs text-primary animate-pulse">
                    Processing now...
                  </p>
                )}
                {isCompleted && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    ✓ Done
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t border-border/50 space-y-1">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Video ID:</span> {videoId.slice(0, 12)}...
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Model:</span> VEO 3.1 AI
        </p>
        <p className="text-[10px] text-muted-foreground/70">
          Status updates every 5 seconds • Real-time progress
        </p>
      </div>
    </Card>
  );
}
