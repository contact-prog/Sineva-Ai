import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Download, Sparkles, Maximize2, X } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';

interface GraphicPreviewCardProps {
  preview: {
    id: string;
    url: string;
    platform?: string;
    dimensions?: string;
    apiUsed?: string;
    metadata?: any;
  };
  config?: any;
}

export default function GraphicPreviewCard({ preview, config }: GraphicPreviewCardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = preview.url;
    link.download = `preview-${preview.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTotalFormats = () => {
    if (!config?.selectedFormats) return 0;
    return Object.values(config.selectedFormats).flat().length;
  };

  return (
    <Card className="p-6 space-y-4 border-primary/20 bg-card/50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Preview Generated</h3>
        </div>
        {config?.selectedFormats && (
          <Badge variant="secondary">
            {getTotalFormats()} format{getTotalFormats() !== 1 ? 's' : ''} ready
          </Badge>
        )}
      </div>

      {/* Preview Image */}
      <div className="relative group">
        <div className="aspect-square rounded-lg overflow-hidden bg-muted border border-border cursor-pointer" onClick={() => setIsFullscreen(true)}>
          <img
            src={preview.url}
            alt="Preview"
            className="w-full h-full object-contain"
          />
        </div>
        {preview.dimensions && (
          <Badge 
            variant="secondary" 
            className="absolute top-2 right-2 bg-background/80 backdrop-blur"
          >
            {preview.dimensions}
          </Badge>
        )}
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => setIsFullscreen(true)}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Fullscreen Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-2">
          <div className="relative w-full h-full flex items-center justify-center bg-background rounded-lg">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10"
              onClick={() => setIsFullscreen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            <img
              src={preview.url}
              alt="Preview fullscreen"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Metadata */}
      {preview.apiUsed && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Powered by {preview.apiUsed}</span>
          {preview.platform && (
            <span className="capitalize">{preview.platform} format</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={handleDownload}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Download Preview
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        The AI will guide you through editing or finalizing this preview
      </p>
    </Card>
  );
}
