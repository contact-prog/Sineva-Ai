import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, RotateCcw, Sparkles } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Separator } from '@/components/ui/separator';

interface Scene {
  scene_number: number;
  visual_description: string;
  narration?: string;
  mood: string;
  duration_seconds: number;
  image_url?: string;
}

interface StoryboardReviewProps {
  scenes: Scene[];
  onGenerateFullStory: () => void;
  onRegenerateImage?: (sceneNumber: number) => void;
  onRegenerateAllImages?: () => void;
  estimatedCost?: number;
  estimatedTime?: number;
}

export function StoryboardReview({ 
  scenes, 
  onGenerateFullStory,
  onRegenerateImage,
  onRegenerateAllImages,
  estimatedCost = 0,
  estimatedTime = 0,
}: StoryboardReviewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Review Storyboard</h3>
          <p className="text-sm text-muted-foreground">
            Review your AI-generated storyboard. You can regenerate individual images or proceed to full video generation.
          </p>
        </div>
        <Badge variant="secondary">{scenes.length} Scenes</Badge>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {scenes.map((scene) => (
          <Card key={scene.scene_number} className="overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
              {/* Image Preview */}
              <div className="md:col-span-1">
                <AspectRatio ratio={16/9} className="bg-muted relative rounded-lg overflow-hidden">
                  {scene.image_url ? (
                    <img 
                      src={scene.image_url.startsWith('data:') ? scene.image_url : `data:image/png;base64,${scene.image_url}`}
                      alt={`Scene ${scene.scene_number}`}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">No image</p>
                    </div>
                  )}
                </AspectRatio>
              </div>

              {/* Scene Details */}
              <div className="md:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge>Scene {scene.scene_number}</Badge>
                    <Badge variant="outline">{scene.duration_seconds}s</Badge>
                    <Badge variant="secondary">{scene.mood}</Badge>
                  </div>
                  {onRegenerateImage && scene.image_url && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRegenerateImage(scene.scene_number)}
                      className="gap-2"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Retry
                    </Button>
                  )}
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Visual Description:</p>
                  <p className="text-sm">{scene.visual_description}</p>
                </div>

                {scene.narration && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Narration:</p>
                    <p className="text-sm italic text-muted-foreground">"{scene.narration}"</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Cost Estimate Section */}
      {estimatedCost > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Estimated Cost:</span>
              <span className="text-lg font-bold">${estimatedCost.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Estimated Time:</span>
              <span className="text-sm">{estimatedTime} minutes</span>
            </div>
          </div>
        </Card>
      )}

      <Separator />

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        {onRegenerateAllImages && (
          <Button
            onClick={onRegenerateAllImages}
            variant="outline"
            size="lg"
            className="w-full gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Regenerate All Images
          </Button>
        )}
        
        <Button
          onClick={onGenerateFullStory}
          size="lg"
          className="w-full gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Generate Full Story {estimatedCost > 0 && `($${estimatedCost.toFixed(2)})`}
        </Button>
      </div>
    </div>
  );
}
