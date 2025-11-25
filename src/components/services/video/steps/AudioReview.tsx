import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Volume2, Music } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';

interface AudioReviewProps {
  voiceoverUrl?: string;
  musicUrl?: string;
  hasVoiceover: boolean;
  hasMusic: boolean;
  onApprove: () => void;
  onSkip: () => void;
}

export function AudioReview({ 
  voiceoverUrl,
  musicUrl,
  hasVoiceover,
  hasMusic,
  onApprove,
  onSkip
}: AudioReviewProps) {
  const hasAnyAudio = hasVoiceover || hasMusic;

  if (!hasAnyAudio) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold">Audio Generation</h3>
          <p className="text-sm text-muted-foreground">
            No audio layers requested. Proceeding to final assembly.
          </p>
        </div>
        <Button onClick={onSkip} className="w-full gap-2">
          <Check className="w-4 h-4" />
          Continue to Assembly
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Review Audio Layers</h3>
          <p className="text-sm text-muted-foreground">
            Review the generated voiceover and music before final assembly.
          </p>
        </div>
        <div className="flex gap-2">
          {hasVoiceover && <Badge variant="secondary">Voiceover</Badge>}
          {hasMusic && <Badge variant="secondary">Music</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {hasVoiceover && voiceoverUrl && (
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Volume2 className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h4 className="font-medium">AI Voiceover</h4>
                  <p className="text-sm text-muted-foreground">
                    Generated narration track
                  </p>
                </div>
                <audio 
                  controls 
                  className="w-full"
                  src={voiceoverUrl}
                >
                  Your browser does not support the audio element.
                </audio>
              </div>
            </div>
          </Card>
        )}

        {hasMusic && musicUrl && (
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Music className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h4 className="font-medium">Background Music</h4>
                  <p className="text-sm text-muted-foreground">
                    Generated music track
                  </p>
                </div>
                <audio 
                  controls 
                  className="w-full"
                  src={musicUrl}
                >
                  Your browser does not support the audio element.
                </audio>
              </div>
            </div>
          </Card>
        )}
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <Button
          onClick={onApprove}
          className="flex-1 gap-2"
        >
          <Check className="w-4 h-4" />
          Approve & Continue to Assembly
        </Button>
      </div>
    </div>
  );
}
