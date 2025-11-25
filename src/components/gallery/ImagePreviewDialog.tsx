import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Calendar, Maximize2 } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';

interface ImagePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  image: {
    id: string;
    url: string;
    prompt: string;
    platform?: string;
    dimensions?: string;
    cost?: number;
    created_at: string;
  } | null;
  onDownload?: () => void;
}

export function ImagePreviewDialog({ open, onOpenChange, image, onDownload }: ImagePreviewDialogProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!image) return null;

  return (
    <>
      <Dialog open={open && !isFullscreen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Image Display */}
            <div className="relative rounded-lg overflow-hidden bg-muted">
              <img
                src={image.url}
                alt={image.prompt}
                className="w-full h-auto max-h-[60vh] object-contain"
              />
              <Button
                size="icon"
                variant="secondary"
                className="absolute top-2 right-2"
                onClick={() => setIsFullscreen(true)}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Metadata */}
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium mb-1">Prompt</p>
                <p className="text-sm text-muted-foreground">{image.prompt}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {image.platform && (
                  <Badge variant="outline" className="capitalize">
                    {image.platform}
                  </Badge>
                )}
                {image.dimensions && (
                  <Badge variant="secondary">{image.dimensions}</Badge>
                )}
                {image.cost && (
                  <Badge variant="outline">${image.cost.toFixed(2)}</Badge>
                )}
                <Badge variant="outline" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(image.created_at), 'MMM d, yyyy')}
                </Badge>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button onClick={onDownload} className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-2">
          <img
            src={image.url}
            alt={image.prompt}
            className="w-full h-full object-contain"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
