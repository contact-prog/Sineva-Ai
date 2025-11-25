import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, RotateCcw, Loader2 } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';

interface SceneImage {
  scene_number: number;
  image_url: string;
  visual_description: string;
  narration: string;
}

interface ImageGenerationReviewProps {
  scenes: SceneImage[];
  onApprove: () => void;
  onRegenerateImage?: (sceneNumber: number) => void;
  regeneratingScenes?: number[];
}

export function ImageGenerationReview({ 
  scenes, 
  onApprove,
  onRegenerateImage,
  regeneratingScenes = []
}: ImageGenerationReviewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Review Generated Images</h3>
          <p className="text-sm text-muted-foreground">
            Review the AI-generated images for each scene. You can regenerate individual images if needed.
          </p>
        </div>
        <Badge variant="secondary">{scenes.length} Images</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
        {scenes.map((scene) => {
          const isRegenerating = regeneratingScenes.includes(scene.scene_number);
          
          return (
            <Card key={scene.scene_number} className="overflow-hidden">
              <AspectRatio ratio={16/9} className="bg-muted relative">
                {isRegenerating ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                    <div className="text-center space-y-2">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                      <p className="text-sm text-muted-foreground">Regenerating...</p>
                    </div>
                  </div>
                ) : (
                  <img 
                    src={scene.image_url.startsWith('data:') ? scene.image_url : `data:image/png;base64,${scene.image_url}`}
                    alt={`Scene ${scene.scene_number}`}
                    className="object-cover w-full h-full"
                  />
                )}
              </AspectRatio>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge>Scene {scene.scene_number}</Badge>
                  {onRegenerateImage && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRegenerateImage(scene.scene_number)}
                      disabled={isRegenerating}
                      className="gap-2"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Regenerate
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {scene.visual_description}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <Button
          onClick={onApprove}
          disabled={regeneratingScenes.length > 0}
          className="flex-1 gap-2"
        >
          <Check className="w-4 h-4" />
          Approve & Continue to Video Generation
        </Button>
      </div>
    </div>
  );
}
