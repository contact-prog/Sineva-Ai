import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ShareToSocialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  mediaUrls?: string[];
}

const PLATFORMS = [
  { id: 'facebook', label: 'Facebook' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'twitter', label: 'Twitter' },
  { id: 'linkedin', label: 'LinkedIn' },
];

export function ShareToSocialModal({ open, onOpenChange, content, mediaUrls = [] }: ShareToSocialModalProps) {
  const [postContent, setPostContent] = useState(content);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['facebook']);
  const navigate = useNavigate();

  const handlePlatformToggle = (platformId: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
  };

  const handleShareToSocial = () => {
    // Navigate to social page with pre-filled content
    navigate('/app/social', {
      state: {
        prefilledContent: postContent,
        selectedPlatforms,
        mediaUrls
      }
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share to Social Media
          </DialogTitle>
          <DialogDescription>
            Choose platforms and edit your post content
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Select Platforms</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {PLATFORMS.map((platform) => (
                <div key={platform.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={platform.id}
                    checked={selectedPlatforms.includes(platform.id)}
                    onCheckedChange={() => handlePlatformToggle(platform.id)}
                  />
                  <label
                    htmlFor={platform.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {platform.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="post-content">Post Content</Label>
            <Textarea
              id="post-content"
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              className="min-h-[150px]"
              placeholder="Edit your post content..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              {postContent.length} characters
            </p>
          </div>

          {mediaUrls.length > 0 && (
            <div>
              <Label>Media Attachments</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {mediaUrls.map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`Media ${index + 1}`}
                    className="w-full aspect-square object-cover rounded border"
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleShareToSocial}
              disabled={selectedPlatforms.length === 0}
            >
              Continue to Social
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
