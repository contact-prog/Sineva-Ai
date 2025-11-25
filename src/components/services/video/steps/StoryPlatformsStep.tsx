import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { StoryFormData } from './StoryCustomizeStep';
import { Zap, Sparkles, DollarSign, Clock } from 'lucide-react';

interface StoryPlatformsStepProps {
  formData: StoryFormData;
  updateFormData: (updates: Partial<StoryFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const PLATFORMS = [
  { id: 'instagram-post', name: 'Instagram Post', aspectRatio: '1:1', dimensions: '1080x1080' },
  { id: 'instagram-story', name: 'Instagram Story', aspectRatio: '9:16', dimensions: '1080x1920' },
  { id: 'instagram-reel', name: 'Instagram Reel', aspectRatio: '9:16', dimensions: '1080x1920' },
  { id: 'tiktok', name: 'TikTok', aspectRatio: '9:16', dimensions: '1080x1920' },
  { id: 'youtube-short', name: 'YouTube Short', aspectRatio: '9:16', dimensions: '1080x1920' },
  { id: 'youtube', name: 'YouTube', aspectRatio: '16:9', dimensions: '1920x1080' },
  { id: 'facebook-post', name: 'Facebook Post', aspectRatio: '1:1', dimensions: '1080x1080' },
  { id: 'twitter', name: 'Twitter/X', aspectRatio: '16:9', dimensions: '1280x720' }
];

export function StoryPlatformsStep({ formData, updateFormData, onNext, onBack }: StoryPlatformsStepProps) {
  const togglePlatform = (platformId: string) => {
    const newPlatforms = formData.platforms.includes(platformId)
      ? formData.platforms.filter(p => p !== platformId)
      : [...formData.platforms, platformId];
    updateFormData({ platforms: newPlatforms });
  };

  const quality = formData.quality || 'fast';
  const estimatedDuration = 30; // Default, will be detected from prompt
  const sceneCount = 6; // Estimate
  
  const calculateCost = (qualityMode: 'fast' | 'premium') => {
    const costPerSecond = qualityMode === 'fast' ? 0.008 : 0.024;
    return (costPerSecond * estimatedDuration * sceneCount).toFixed(2);
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-lg font-semibold">Select Target Platforms</Label>
        <p className="text-sm text-muted-foreground mt-1">
          Videos will be optimized for each platform's specifications
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {PLATFORMS.map((platform) => (
          <Card
            key={platform.id}
            className={cn(
              "cursor-pointer transition-all hover:bg-muted/50",
              formData.platforms.includes(platform.id) && "border-primary ring-2 ring-primary/20"
            )}
            onClick={() => togglePlatform(platform.id)}
          >
            <div className="flex items-center space-x-3 p-4">
              <Checkbox
                checked={formData.platforms.includes(platform.id)}
                onCheckedChange={() => togglePlatform(platform.id)}
              />
              <div className="flex-1">
                <div className="font-medium">{platform.name}</div>
                <div className="text-xs text-muted-foreground">
                  {platform.aspectRatio} • {platform.dimensions}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {formData.platforms.length > 0 && (
        <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
          Selected: {formData.platforms.length} platform{formData.platforms.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Quality Selector */}
      <div className="space-y-4 border-t pt-4">
        <div>
          <Label className="text-lg font-semibold">Video Quality</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Choose generation speed and quality
          </p>
        </div>

        <RadioGroup
          value={quality}
          onValueChange={(value: 'fast' | 'premium') => updateFormData({ quality: value })}
        >
          {/* Fast Mode */}
          <Card
            className={cn(
              "cursor-pointer transition-all hover:bg-muted/50",
              quality === 'fast' && "border-primary ring-2 ring-primary/20"
            )}
            onClick={() => updateFormData({ quality: 'fast' })}
          >
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="fast" id="fast" />
                  <div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      <Label htmlFor="fast" className="font-semibold text-base cursor-pointer">
                        Fast Mode (Recommended)
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Perfect for social media and quick iterations
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm ml-7">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>60-90s per clip</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span>${calculateCost('fast')} estimated</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Premium Mode */}
          <Card
            className={cn(
              "cursor-pointer transition-all hover:bg-muted/50",
              quality === 'premium' && "border-primary ring-2 ring-primary/20"
            )}
            onClick={() => updateFormData({ quality: 'premium' })}
          >
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="premium" id="premium" />
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <Label htmlFor="premium" className="font-semibold text-base cursor-pointer">
                        Premium Mode
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Production-quality for professional use
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm ml-7">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>120-180s per clip</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span>${calculateCost('premium')} estimated</span>
                </div>
              </div>
            </div>
          </Card>
        </RadioGroup>
      </div>

      <div className="space-y-3">
        <div className="bg-muted/30 p-4 rounded-lg">
          <p className="text-sm text-muted-foreground mb-3">
            Choose how to proceed:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button 
              onClick={() => {
                updateFormData({ previewMode: true });
                onNext();
              }} 
              size="lg" 
              variant="outline"
              className="w-full flex flex-col h-auto py-4"
              disabled={formData.platforms.length === 0}
            >
              <span className="font-semibold mb-1">Preview Storyboard</span>
              <span className="text-xs text-muted-foreground">Review scenes & images first (faster, cheaper)</span>
            </Button>
            <Button 
              onClick={() => {
                updateFormData({ previewMode: false });
                onNext();
              }} 
              size="lg"
              className="w-full flex flex-col h-auto py-4"
              disabled={formData.platforms.length === 0}
            >
              <span className="font-semibold mb-1">Create Full Video</span>
              <span className="text-xs text-muted-foreground">Generate complete video directly (slower, more expensive)</span>
            </Button>
          </div>
        </div>
        <Button onClick={onBack} variant="ghost" size="lg" className="w-full">
          Back
        </Button>
      </div>
    </div>
  );
}
