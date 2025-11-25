import { useState, useRef } from 'react';
import { Upload, X, ImagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface FrameDropZoneProps {
  zoneType: 'start' | 'end';
  assignedFrame: string | null;
  onFrameAssigned: (imageUrl: string) => void;
  onFrameRemoved: () => void;
  onFileUpload: (file: File) => void;
  isActive: boolean;
  isUploading?: boolean;
}

export function FrameDropZone({ 
  zoneType, 
  assignedFrame, 
  onFrameAssigned, 
  onFrameRemoved,
  onFileUpload,
  isActive,
  isUploading = false
}: FrameDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const imageUrl = e.dataTransfer.getData('imageUrl');
    if (imageUrl) {
      onFrameAssigned(imageUrl);
    }
  };

  const handleFileInputClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onFileUpload(file);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative rounded-lg border-2 border-dashed transition-all h-[200px] flex items-center justify-center",
        isDragOver && isActive && "border-primary bg-primary/5 scale-[1.02]",
        !isDragOver && isActive && "border-muted-foreground/30",
        !isActive && "border-muted-foreground/10 bg-muted/20",
        assignedFrame && "border-solid border-primary/50"
      )}
    >
      {assignedFrame ? (
        <div className="relative w-full h-full">
          <img 
            src={assignedFrame} 
            alt={`${zoneType} frame assigned`}
            className="w-full h-auto rounded-lg"
          />
          <div className="absolute top-2 left-2 bg-primary/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium text-primary-foreground capitalize">
            {zoneType} Frame Assigned
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={onFrameRemoved}
            className="absolute top-2 right-2"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="text-center p-4">
          <div className={cn(
            "mx-auto w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors",
            isDragOver && isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            {isUploading ? (
              <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
          </div>
          <p className="text-sm font-medium mb-1 capitalize">
            {zoneType} Frame
          </p>
          <p className="text-xs text-muted-foreground mb-2 h-8 flex flex-col items-center justify-center">
            <span>Drag or upload</span>
            {zoneType === 'start' && <span className="text-destructive">*Required</span>}
          </p>
          {!isUploading && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleFileInputClick}
                className="mt-1"
              >
                <ImagePlus className="w-4 h-4 mr-2" />
                Upload
              </Button>
            </>
          )}
        </div>
      )}

      {/* Drag Over Indicator */}
      {isDragOver && isActive && (
        <div className="absolute inset-0 bg-primary/10 rounded-lg pointer-events-none animate-pulse" />
      )}
    </div>
  );
}
