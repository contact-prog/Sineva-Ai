import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Share2, Video } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface VideoCompletionScreenProps {
  videoUrl: string;
  totalCost: number;
  duration: number;
  clipCount: number;
  onGenerateAnother: () => void;
}

export function VideoCompletionScreen({ 
  videoUrl, 
  totalCost, 
  duration, 
  clipCount,
  onGenerateAnother 
}: VideoCompletionScreenProps) {
  const handleDownload = () => {
    window.open(videoUrl, '_blank');
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'My AI Video',
        url: videoUrl
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Video className="w-6 h-6 text-primary" />
          <h3 className="text-xl font-semibold">Video Complete!</h3>
        </div>
        <p className="text-muted-foreground">
          Your {duration}-second video is ready
        </p>
      </div>

      {/* Video Player */}
      <Card className="overflow-hidden">
        <video 
          src={videoUrl} 
          controls 
          className="w-full"
          preload="metadata"
        >
          Your browser does not support the video tag.
        </video>
      </Card>

      {/* Cost Breakdown */}
      <Alert>
        <AlertDescription className="flex items-center justify-between">
          <span>Total cost: <strong>${totalCost.toFixed(2)}</strong></span>
          <Badge variant="secondary">{clipCount} clips generated</Badge>
        </AlertDescription>
      </Alert>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <Button onClick={handleDownload} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
        <Button onClick={handleShare} variant="outline">
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      </div>

      <Button onClick={onGenerateAnother} size="lg" className="w-full">
        Generate Another Video
      </Button>
    </div>
  );
}
