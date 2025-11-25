import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Mic, Music, Image } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StoryFormData {
  storyInput: string;
  duration: number;
  style: string;
  platforms: string[];
  includeVoiceover: boolean;
  includeMusic: boolean;
  includeLogo: boolean;
  videoQuality: 'standard' | 'fast';
  quality?: 'fast' | 'premium';
  previewMode?: boolean;
  aspectRatio?: '16:9' | '9:16' | '1:1';
}

interface StoryCustomizeStepProps {
  formData: StoryFormData;
  updateFormData: (updates: Partial<StoryFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StoryCustomizeStep({ formData, updateFormData, onNext, onBack }: StoryCustomizeStepProps) {
  const styles: Array<{
    value: 'narrative' | 'viral' | 'music' | 'product';
    icon: string;
    label: string;
    description: string;
  }> = [
    { value: 'narrative', icon: '📖', label: 'Narrative Story', description: 'Cinematic, emotional, story-driven' },
    { value: 'viral', icon: '🚀', label: 'Viral Content', description: 'Fast-paced, engaging, social-first' },
    { value: 'music', icon: '🎵', label: 'Music Video', description: 'Rhythm-based, artistic, creative' },
    { value: 'product', icon: '📦', label: 'Product Showcase', description: 'Professional, clean, feature-focused' }
  ];

  return (
    <div className="space-y-6">
      {/* Style Selection */}
      <div>
        <Label className="text-lg font-semibold">Video Style</Label>
        <div className="grid grid-cols-2 gap-4 mt-2">
          {styles.map((style) => (
            <Card
              key={style.value}
              className={cn(
                "cursor-pointer transition-all hover:bg-muted/50",
                formData.style === style.value && "border-primary ring-2 ring-primary/20"
              )}
              onClick={() => updateFormData({ style: style.value })}
            >
              <div className="flex items-center space-x-3 p-4">
                <div className="text-3xl">{style.icon}</div>
                <div className="flex-1">
                  <div className="font-medium">{style.label}</div>
                  <div className="text-xs text-muted-foreground">{style.description}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Video Quality */}
      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold">Video Quality</h3>
        <div className="grid grid-cols-2 gap-4">
          <Card 
            className={`p-4 cursor-pointer transition-all ${formData.videoQuality === 'standard' ? 'border-primary ring-2 ring-primary' : 'border-border hover:border-primary/50'}`}
            onClick={() => updateFormData({ videoQuality: 'standard' })}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h4 className="font-semibold">Standard Quality</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Premium quality, best prompt adherence
                </p>
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-muted-foreground">~8-10 mins generation</p>
                  <p className="text-xs font-medium">$0.48/second</p>
                </div>
              </div>
            </div>
          </Card>
          
          <Card 
            className={`p-4 cursor-pointer transition-all ${formData.videoQuality === 'fast' ? 'border-primary ring-2 ring-primary' : 'border-border hover:border-primary/50'}`}
            onClick={() => updateFormData({ videoQuality: 'fast' })}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h4 className="font-semibold">Fast Generation</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Faster results, cost-effective
                </p>
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-muted-foreground">~3-5 mins generation</p>
                  <p className="text-xs font-medium">$0.30/second</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </Card>

      {/* Audio & Branding */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base">Additional Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mic className="w-4 h-4 text-muted-foreground" />
              <div>
                <Label className="font-medium">AI Voiceover Narration</Label>
                <p className="text-xs text-muted-foreground">Professional voice narrating your story</p>
              </div>
            </div>
            <Switch 
              checked={formData.includeVoiceover} 
              onCheckedChange={(checked) => updateFormData({ includeVoiceover: checked })} 
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Music className="w-4 h-4 text-muted-foreground" />
              <div>
                <Label className="font-medium">Background Music</Label>
                <p className="text-xs text-muted-foreground">Mood-appropriate royalty-free music</p>
              </div>
            </div>
            <Switch 
              checked={formData.includeMusic} 
              onCheckedChange={(checked) => updateFormData({ includeMusic: checked })} 
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image className="w-4 h-4 text-muted-foreground" />
              <div>
                <Label className="font-medium">Brand Logo Overlay</Label>
                <p className="text-xs text-muted-foreground">Logo from your Brand Kit</p>
              </div>
            </div>
            <Switch 
              checked={formData.includeLogo} 
              onCheckedChange={(checked) => updateFormData({ includeLogo: checked })} 
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={onBack} variant="outline" size="lg" className="w-full">
          Back
        </Button>
        <Button onClick={onNext} size="lg" className="w-full">
          Next: Select Platforms
        </Button>
      </div>
    </div>
  );
}
