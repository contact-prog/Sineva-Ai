import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { RefreshCw, Check, Edit2 } from 'lucide-react';
import { useState } from 'react';

interface Scene {
  id?: string;
  scene_number: number;
  visual_description: string;
  duration_seconds: number;
  mood?: string;
}

interface ScenePlanReviewProps {
  scenes: Scene[];
  detectedDuration: number;
  onApprove: () => void;
  onEditScene: (sceneNumber: number, newDescription: string) => void;
  onRegenerate: () => void;
}

export function ScenePlanReview({ 
  scenes, 
  detectedDuration,
  onApprove, 
  onEditScene,
  onRegenerate 
}: ScenePlanReviewProps) {
  const [editingScene, setEditingScene] = useState<number | null>(null);
  const [editedDescription, setEditedDescription] = useState('');

  const handleStartEdit = (scene: Scene) => {
    setEditingScene(scene.scene_number);
    setEditedDescription(scene.visual_description);
  };

  const handleSaveEdit = (sceneNumber: number) => {
    onEditScene(sceneNumber, editedDescription);
    setEditingScene(null);
    setEditedDescription('');
  };

  const handleCancelEdit = () => {
    setEditingScene(null);
    setEditedDescription('');
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold">Review Scene Plan</h3>
        <p className="text-muted-foreground">
          {scenes.length} scenes planned for your {detectedDuration}s video
        </p>
      </div>

      {/* Scene Cards */}
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {scenes.map((scene) => (
          <Card key={scene.scene_number} className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Scene {scene.scene_number}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {scene.duration_seconds}s
                  </span>
                  {scene.mood && (
                    <Badge variant="secondary" className="text-xs">
                      {scene.mood}
                    </Badge>
                  )}
                </div>
                {editingScene !== scene.scene_number && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleStartEdit(scene)}
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                )}
              </div>

              {editingScene === scene.scene_number ? (
                <div className="space-y-2">
                  <Textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    placeholder="Visual description..."
                    className="min-h-[100px]"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSaveEdit(scene.scene_number)}
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {scene.visual_description}
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={onRegenerate}
          variant="outline"
          className="flex-1"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Regenerate Plan
        </Button>
        <Button
          onClick={onApprove}
          className="flex-1"
          disabled={editingScene !== null}
        >
          <Check className="w-4 h-4 mr-2" />
          Approve & Generate Videos
        </Button>
      </div>
    </div>
  );
}
