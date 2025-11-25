import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ScenePlanningStatusProps {
  detectedDuration?: number;
  sceneCount?: number;
  message?: string;
}

export function ScenePlanningStatus({ detectedDuration, sceneCount, message }: ScenePlanningStatusProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <Loader2 className="w-12 h-12 animate-spin text-primary" />
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold">Planning Your Story</h3>
        <p className="text-muted-foreground">
          {message || "AI is analyzing your prompt and dividing it into scenes..."}
        </p>
      </div>
      
      {detectedDuration && (
        <Alert className="max-w-md">
          <AlertDescription className="text-center">
            Detected: <strong>{detectedDuration}-second video</strong>
            {sceneCount && ` with ${sceneCount} scenes`}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
