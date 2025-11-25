import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Calendar, Clock, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

interface VideoPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: {
    id: string;
    url: string;
    thumbnail?: string;
    prompt: string;
    platform?: string;
    duration?: number;
    cost?: number;
    status?: string;
    created_at: string;
  } | null;
  onDownload?: () => void;
}

export function VideoPreviewDialog({ open, onOpenChange, video, onDownload }: VideoPreviewDialogProps) {
  if (!video) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Video Preview</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Video Player */}
          <div className="relative rounded-lg overflow-hidden bg-muted min-h-[500px] flex items-center justify-center">
            <video
              src={video.url}
              poster={video.thumbnail}
              controls
              className="w-full h-auto max-h-[60vh]"
              preload="metadata"
            >
              Your browser does not support the video tag.
            </video>
          </div>

          {/* Metadata */}
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-1">Prompt</p>
              <p className="text-sm text-muted-foreground">{video.prompt}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {video.status && (
                <Badge 
                  variant={video.status === 'completed' ? 'default' : 'secondary'}
                  className="capitalize"
                >
                  {video.status}
                </Badge>
              )}
              {video.platform && (
                <Badge variant="outline" className="capitalize">
                  {video.platform}
                </Badge>
              )}
              {video.duration && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {video.duration}s
                </Badge>
              )}
              {video.cost && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {video.cost.toFixed(2)}
                </Badge>
              )}
              <Badge variant="outline" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(video.created_at), 'MMM d, yyyy')}
              </Badge>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button onClick={onDownload} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download Video
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
