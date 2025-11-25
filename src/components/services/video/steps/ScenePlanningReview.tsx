import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Pencil, Check, RotateCcw } from 'lucide-react';
import { useState } from 'react';

interface Scene {
  scene_number: number;
  visual_description: string;
  narration: string;
  mood: string;
  duration_seconds: number;
}

interface ScenePlanningReviewProps {
  scenes: Scene[];
  onApprove: () => void;
  onRegenerate: () => void;
  isRegenerating?: boolean;
}

export function ScenePlanningReview({ 
  scenes, 
  onApprove, 
  onRegenerate,
  isRegenerating = false 
}: ScenePlanningReviewProps) {
  const [editingScene, setEditingScene] = useState<number | null>(null);
  const [editedScenes, setEditedScenes] = useState<Scene[]>(scenes);

  const handleEdit = (sceneNumber: number) => {
    setEditingScene(sceneNumber);
  };

  const handleSave = (sceneNumber: number) => {
    setEditingScene(null);
  };

  const handleChange = (sceneNumber: number, field: keyof Scene, value: string | number) => {
    setEditedScenes(prev => prev.map(scene => 
      scene.scene_number === sceneNumber 
        ? { ...scene, [field]: value }
        : scene
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Review Planned Scenes</h3>
          <p className="text-sm text-muted-foreground">
            Review the AI-generated scene plan. You can edit or regenerate before proceeding.
          </p>
        </div>
        <Badge variant="secondary">{scenes.length} Scenes</Badge>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {editedScenes.map((scene) => (
          <Card key={scene.scene_number} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge>Scene {scene.scene_number}</Badge>
                <Badge variant="outline">{scene.duration_seconds}s</Badge>
                <Badge variant="outline" className="capitalize">{scene.mood}</Badge>
              </div>
              {editingScene === scene.scene_number ? (
                <Button 
                  size="sm" 
                  onClick={() => handleSave(scene.scene_number)}
                  className="gap-2"
                >
                  <Check className="w-4 h-4" />
                  Save
                </Button>
              ) : (
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => handleEdit(scene.scene_number)}
                  className="gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </Button>
              )}
            </div>

            {editingScene === scene.scene_number ? (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Visual Description</label>
                  <Textarea
                    value={scene.visual_description}
                    onChange={(e) => handleChange(scene.scene_number, 'visual_description', e.target.value)}
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Narration</label>
                  <Textarea
                    value={scene.narration}
                    onChange={(e) => handleChange(scene.scene_number, 'narration', e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Visual</p>
                  <p className="text-sm">{scene.visual_description}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Narration</p>
                  <p className="text-sm italic">{scene.narration}</p>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <Button
          onClick={onRegenerate}
          variant="outline"
          disabled={isRegenerating}
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          {isRegenerating ? 'Regenerating...' : 'Regenerate Plan'}
        </Button>
        <Button
          onClick={onApprove}
          disabled={isRegenerating}
          className="flex-1 gap-2"
        >
          <Check className="w-4 h-4" />
          Approve & Continue to Images
        </Button>
      </div>
    </div>
  );
}
