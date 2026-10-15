import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Download, Loader2 } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';

import type { PlatformVideo } from './videoExport';

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
            <AspectRatio ratio={Number(video.aspectRatio.split(':')[0]) / Number(video.aspectRatio.split(':')[1]) || 16 / 9} className="bg-muted">
              <video 
                controls
                className="w-full h-full object-contain"
                src={video.url}
                poster={video.thumbnailUrl}
                preload="metadata"
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
                <Button size="sm" variant="outline" className="flex-1 gap-2" asChild>
                  <a
                    href={`${video.url}${video.url.includes('?') ? '&' : '?'}download=${encodeURIComponent(`sineva-${video.platform}.mp4`)}`}
                    download={`sineva-${video.platform}.mp4`}
                    onClick={onDownload ? (event) => { event.preventDefault(); onDownload(video.url, video.platform); } : undefined}
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
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
