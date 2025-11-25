import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Download, Share2, Loader2 } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';

interface PlatformVideo {
  platform: string;
  url: string;
  format: string;
}

interface FinalAssemblyStatusProps {
  isAssembling: boolean;
  videos?: PlatformVideo[];
  onComplete: () => void;
  onDownload?: (url: string, platform: string) => void;
}

export function FinalAssemblyStatus({ 
  isAssembling,
  videos = [],
  onComplete,
  onDownload
}: FinalAssemblyStatusProps) {
  if (isAssembling) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4 text-primary" />
          <h3 className="text-lg font-semibold mb-2">Assembling Final Videos</h3>
          <p className="text-sm text-muted-foreground">
            Combining all elements into platform-optimized videos...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Check className="w-5 h-5 text-green-500" />
            Videos Ready!
          </h3>
          <p className="text-sm text-muted-foreground">
            Your videos have been generated and are ready to download or share.
          </p>
        </div>
        <Badge variant="secondary" className="bg-green-500/10 text-green-500">
          {videos.length} Videos
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {videos.map((video, index) => (
          <Card key={index} className="overflow-hidden">
            <AspectRatio ratio={16/9} className="bg-muted">
              <video 
                controls
                className="w-full h-full object-cover"
                src={video.url}
              >
                Your browser does not support the video element.
              </video>
            </AspectRatio>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge>{video.platform}</Badge>
                  <Badge variant="outline">{video.format}</Badge>
                </div>
              </div>
              <div className="flex gap-2">
                {onDownload && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDownload(video.url, video.platform)}
                    className="flex-1 gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <Button
          onClick={onComplete}
          className="flex-1 gap-2"
        >
          <Check className="w-4 h-4" />
          Done
        </Button>
      </div>
    </div>
  );
}
