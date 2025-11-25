import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { RefreshCw, Sparkles, Edit2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useState } from 'react';

interface Scene {
  scene_number: number;
  visual_description: string;
  duration_seconds: number;
  image_url?: string;
}

interface SceneImageReviewProps {
  scenes: Scene[];
  estimatedCost: number;
  estimatedTime: number;
  onApprove: () => void;
  onRetryImage?: (sceneNumber: number) => void;
  onEditImage?: (sceneNumber: number, editPrompt: string) => void;
  isGenerating?: boolean;
}

export function SceneImageReview({ 
  scenes, 
  estimatedCost, 
  estimatedTime,
  onApprove, 
  onRetryImage,
  onEditImage,
  isGenerating 
}: SceneImageReviewProps) {
  const [editingScene, setEditingScene] = useState<number | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold">Review Scene Images</h3>
        <p className="text-muted-foreground">
          Check the keyframes before generating video clips
        </p>
      </div>

      {/* Cost Estimate */}
      <Alert className="border-primary/50 bg-primary/5">
        <Sparkles className="w-4 h-4 text-primary" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            Generating {scenes.length} video clips will cost <strong>${estimatedCost.toFixed(2)}</strong>
          </span>
          <Badge variant="secondary">~{estimatedTime} min</Badge>
        </AlertDescription>
      </Alert>

      {/* Image Grid */}
      <div className="grid grid-cols-2 gap-4">
        {scenes.map((scene) => (
          <Card key={scene.scene_number} className="overflow-hidden">
            <div className="aspect-video bg-muted relative">
              {scene.image_url ? (
                <img 
                  src={scene.image_url.startsWith('data:') ? scene.image_url : `data:image/png;base64,${scene.image_url}`}
                  alt={`Scene ${scene.scene_number}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <span className="text-muted-foreground">Loading...</span>
                </div>
              )}
              <Badge className="absolute top-2 left-2">
                Scene {scene.scene_number}
              </Badge>
            </div>
            <div className="p-4 space-y-2">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {scene.visual_description}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{scene.duration_seconds}s</span>
                <div className="flex gap-1">
                  {onRetryImage && (
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => onRetryImage(scene.scene_number)}
                      disabled={isGenerating}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Retry
                    </Button>
                  )}
                  {onEditImage && (
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => {
                        setEditingScene(editingScene === scene.scene_number ? null : scene.scene_number);
                        setEditPrompt('');
                      }}
                      disabled={isGenerating}
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>
              
              {editingScene === scene.scene_number && onEditImage && (
                <div className="flex gap-2 pt-2">
                  <Input
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder="e.g., 'make the dog brown', 'add sunset lighting'"
                    className="flex-1 text-xs"
                    disabled={isGenerating}
                  />
                  <Button
                    onClick={() => {
                      if (editPrompt.trim()) {
                        onEditImage(scene.scene_number, editPrompt);
                        setEditPrompt('');
                        setEditingScene(null);
                      }
                    }}
                    size="sm"
                    disabled={!editPrompt.trim() || isGenerating}
                  >
                    Apply
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Approve Button */}
      <Button 
        onClick={onApprove} 
        size="lg" 
        className="w-full"
        disabled={isGenerating || scenes.some(s => !s.image_url)}
      >
        {isGenerating ? 'Generating...' : 'Approve & Generate Videos'}
      </Button>
    </div>
  );
}
