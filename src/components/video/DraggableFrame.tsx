import { useState } from 'react';
import { GripVertical, Check, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface DraggableFrameProps {
  imageUrl: string;
  frameType: 'start' | 'end';
  isSaved: boolean;
  onDragStart: (imageUrl: string, frameType: 'start' | 'end') => void;
  onDragEnd: () => void;
  onSave?: () => void;
  isSaving?: boolean;
  compact?: boolean;
}

export function DraggableFrame({ 
  imageUrl, 
  frameType, 
  isSaved, 
  onDragStart, 
  onDragEnd,
  onSave,
  isSaving,
  compact = false
}: DraggableFrameProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('imageUrl', imageUrl);
    e.dataTransfer.setData('frameType', frameType);
    setIsDragging(true);
    onDragStart(imageUrl, frameType);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    onDragEnd();
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        "relative group cursor-move rounded-lg border-2 border-border overflow-hidden transition-all",
        compact ? "h-32" : "h-auto",
        isDragging && "opacity-50 scale-95",
        !isDragging && "hover:border-primary hover:shadow-lg"
      )}
    >
      <img 
        src={imageUrl} 
        alt={`${frameType} frame`} 
        className={cn("w-full", compact ? "h-full object-cover" : "h-auto")}
        draggable={false}
      />
      
      {/* Drag Handle Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute bottom-2 left-2 flex items-center gap-2 text-white">
          <GripVertical className="w-4 h-4" />
          <span className="text-xs font-medium">Drag to assign</span>
        </div>
      </div>

      {/* Frame Type Badge with Save Status */}
      <div className="absolute top-2 right-2 flex items-center gap-2">
        <div className="bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium capitalize">
          {frameType} Frame
        </div>
        {isSaved ? (
          <div className="bg-primary/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-primary-foreground flex items-center gap-1">
            <Check className="w-3 h-3" />
            Saved
          </div>
        ) : onSave && (
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onSave();
            }}
            disabled={isSaving}
            className="h-6 px-2 text-xs"
          >
            {isSaving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="w-3 h-3 mr-1" />
                Save
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
