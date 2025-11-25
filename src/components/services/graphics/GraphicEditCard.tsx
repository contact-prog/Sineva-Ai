import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Send } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';

interface GraphicEditCardProps {
  preview: {
    id: string;
    url: string;
    platform?: string;
    dimensions?: string;
  };
}

const EDIT_SUGGESTIONS = [
  "Make colors more vibrant",
  "Adjust logo position",
  "Add text overlay",
  "Change background to blue",
  "Make logo bigger",
  "Increase contrast"
];

export default function GraphicEditCard({ preview }: GraphicEditCardProps) {
  const { sendMessage } = useChat();
  const [editInstructions, setEditInstructions] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleApplyEdit = async () => {
    if (!editInstructions.trim()) return;
    
    setIsEditing(true);
    await sendMessage(`Edit graphic: ${editInstructions}`);
    setEditInstructions('');
    // Note: setIsEditing(false) will be handled when orchestrator returns
  };

  const applySuggestion = (suggestion: string) => {
    setEditInstructions(suggestion);
  };

  return (
    <Card className="p-6 space-y-4 border-primary/20 bg-card/50">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Edit Your Graphic</h3>
      </div>

      {/* Current Preview Thumbnail */}
      <div className="relative">
        <div className="aspect-video rounded-lg overflow-hidden bg-muted border border-border max-h-48">
          <img
            src={preview.url}
            alt="Current preview"
            className="w-full h-full object-contain"
          />
        </div>
        <Badge 
          variant="secondary" 
          className="absolute top-2 left-2 bg-background/80 backdrop-blur"
        >
          Current Version
        </Badge>
      </div>

      {/* Edit Instructions */}
      <div className="space-y-2">
        <p className="text-sm font-medium">What changes would you like?</p>
        <Textarea
          value={editInstructions}
          onChange={(e) => setEditInstructions(e.target.value)}
          placeholder='E.g., "Make logo bigger", "Change background to blue"'
          className="min-h-[80px]"
          disabled={isEditing}
        />
      </div>

      {/* Apply Button */}
      <Button
        onClick={handleApplyEdit}
        disabled={!editInstructions.trim() || isEditing}
        className="w-full gap-2"
      >
        {isEditing ? (
          <>
            <Sparkles className="h-4 w-4 animate-spin" />
            Applying Changes...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Apply Changes
          </>
        )}
      </Button>

      {/* Suggestions */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Quick Suggestions:</p>
        <div className="flex flex-wrap gap-2">
          {EDIT_SUGGESTIONS.map((suggestion) => (
            <Button
              key={suggestion}
              variant="outline"
              size="sm"
              onClick={() => applySuggestion(suggestion)}
              className="text-xs h-7"
              disabled={isEditing}
            >
              {suggestion}
            </Button>
          ))}
        </div>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Edits are powered by Gemini 3.0 Pro Image (Nanobanana Pro)
      </p>
    </Card>
  );
}
