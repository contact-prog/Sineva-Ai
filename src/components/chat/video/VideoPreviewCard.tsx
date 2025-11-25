import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Share2, 
  ExternalLink, 
  Clock, 
  Film,
  CheckCircle2 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface VideoPreviewCardProps {
  videoId: string;
  videoUrl: string;
  thumbnailUrl?: string;
  platforms: string[];
  duration: number;
  prompt: string;
  status: string;
}

export default function VideoPreviewCard({
  videoId,
  videoUrl,
  thumbnailUrl,
  platforms,
  duration,
  prompt,
  status
}: VideoPreviewCardProps) {
  const navigate = useNavigate();

  const handleViewFullDetails = () => {
    navigate(`/app/video-result?id=${videoId}`);
  };

  const handleDownload = () => {
    window.open(videoUrl, '_blank');
  };

  return (
    <Card className="p-6 space-y-4 bg-card border-border/30">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">Video Generated Successfully!</h4>
            <Badge variant="default" className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Complete
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {prompt}
          </p>
        </div>
      </div>

      {/* Video Preview */}
      <div className="relative rounded-lg overflow-hidden bg-muted aspect-video">
        <video
          src={videoUrl}
          poster={thumbnailUrl}
          controls
          className="w-full h-full object-cover"
        >
          Your browser does not support the video tag.
        </video>
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          <span>{duration}s</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Film className="h-3.5 w-3.5" />
          <span>{platforms.length} platform{platforms.length > 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Platform Badges */}
      <div className="flex flex-wrap gap-2">
        {platforms.map(platform => (
          <Badge key={platform} variant="secondary" className="capitalize">
            {platform}
          </Badge>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          onClick={handleViewFullDetails}
          variant="default"
          size="sm"
          className="flex-1"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          View Full Details
        </Button>
        <Button
          onClick={handleDownload}
          variant="outline"
          size="sm"
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border/50">
        Video optimized for {platforms.join(', ')}
      </p>
    </Card>
  );
}
