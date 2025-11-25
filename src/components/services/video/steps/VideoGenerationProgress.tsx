import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Loader2 } from 'lucide-react';

interface VideoGenerationProgressProps {
  currentClip: number;
  totalClips: number;
  estimatedTimeRemaining: number;
}

export function VideoGenerationProgress({ 
  currentClip, 
  totalClips, 
  estimatedTimeRemaining 
}: VideoGenerationProgressProps) {
  const progress = (currentClip / totalClips) * 100;

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <Loader2 className="w-12 h-12 animate-spin text-primary" />
      
      <div className="text-center space-y-2 w-full max-w-md">
        <h3 className="text-xl font-semibold">Generating Video Clips</h3>
        <p className="text-muted-foreground">
          Clip {currentClip} of {totalClips}
        </p>
        
        <Progress value={progress} className="w-full mt-4" />
      </div>

      <Alert className="max-w-md">
        <Clock className="w-4 h-4" />
        <AlertDescription>
          <strong>{estimatedTimeRemaining} minutes</strong> remaining
          <br />
          <span className="text-xs text-muted-foreground">
            You can close this and check back later
          </span>
        </AlertDescription>
      </Alert>
    </div>
  );
}
