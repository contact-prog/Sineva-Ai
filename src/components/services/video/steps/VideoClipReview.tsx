import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Check, DollarSign, Clock, Zap } from 'lucide-react';
import { useState } from 'react';
import { AspectRatio } from '@/components/ui/aspect-ratio';

interface VideoClip {
  scene_number: number;
  video_clip_url: string;
  visual_description: string;
  duration_seconds: number;
}

interface VideoClipReviewProps {
  scenes: VideoClip[];
  estimatedCost: number;
  estimatedTime: number;
  veoModel: string;
  onApprove: () => void;
  onBack: () => void;
}

export function VideoClipReview({ 
  scenes, 
  estimatedCost,
  estimatedTime,
  veoModel,
  onApprove,
  onBack
}: VideoClipReviewProps) {
  const [showCostDialog, setShowCostDialog] = useState(false);
  const [hasAcceptedCost, setHasAcceptedCost] = useState(false);

  const handleInitiateGeneration = () => {
    setShowCostDialog(true);
  };

  const handleConfirmCost = () => {
    setHasAcceptedCost(true);
    setShowCostDialog(false);
    onApprove();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Generate Video Clips</h3>
          <p className="text-sm text-muted-foreground">
            Ready to generate video clips from approved images. Review cost estimate before proceeding.
          </p>
        </div>
        <Badge variant="secondary">{scenes.length} Clips</Badge>
      </div>

      <Card className="p-6 bg-muted/50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Estimated Cost</p>
              <p className="text-2xl font-bold">${estimatedCost.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                ${(estimatedCost / scenes.length).toFixed(2)} per clip
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Estimated Time</p>
              <p className="text-2xl font-bold">~{estimatedTime} min</p>
              <p className="text-xs text-muted-foreground mt-1">
                Processing time
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">VEO Model</p>
              <p className="text-lg font-bold">{veoModel}</p>
              <p className="text-xs text-muted-foreground mt-1">
                AI model selected
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64 overflow-y-auto">
        {scenes.map((scene) => (
          <Card key={scene.scene_number} className="overflow-hidden">
            <AspectRatio ratio={16/9} className="bg-muted">
              <img 
                src={scene.video_clip_url} 
                alt={`Scene ${scene.scene_number}`}
                className="object-cover w-full h-full"
              />
            </AspectRatio>
            <div className="p-3">
              <div className="flex items-center justify-between">
                <Badge>Scene {scene.scene_number}</Badge>
                <Badge variant="outline">{scene.duration_seconds}s</Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <Button onClick={onBack} variant="outline">
          Back to Images
        </Button>
        <Button
          onClick={handleInitiateGeneration}
          disabled={hasAcceptedCost}
          className="flex-1 gap-2"
        >
          {hasAcceptedCost ? (
            <>Generating...</>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Generate Video Clips
            </>
          )}
        </Button>
      </div>

      <AlertDialog open={showCostDialog} onOpenChange={setShowCostDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Cost Confirmation Required
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 pt-4">
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-foreground font-medium">Video Clips:</span>
                  <span className="text-foreground">{scenes.length} clips</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground font-medium">Estimated Cost:</span>
                  <span className="text-foreground font-bold">${estimatedCost.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground font-medium">VEO Model:</span>
                  <span className="text-foreground">{veoModel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground font-medium">Estimated Time:</span>
                  <span className="text-foreground">~{estimatedTime} minutes</span>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                ⚠️ This operation will incur costs. Once confirmed, video generation will begin and cannot be cancelled.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCost}>
              I Understand - Generate Videos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
