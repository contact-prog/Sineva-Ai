import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Sparkles, Upload, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { ReferenceImageGuide } from '../ReferenceImageGuide';

interface StoryInputStepProps {
  storyInput: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  referenceImage?: string;
  updateStoryInput: (value: string) => void;
  updateAspectRatio: (value: '16:9' | '9:16' | '1:1') => void;
  updateReferenceImage?: (value: string | undefined) => void;
  onNext: () => void;
}

export function StoryInputStep({ 
  storyInput, 
  aspectRatio,
  referenceImage,
  updateStoryInput, 
  updateAspectRatio,
  updateReferenceImage,
  onNext 
}: StoryInputStepProps) {
  const [isDragging, setIsDragging] = useState(false);

  const aspectRatios = [
    { value: '16:9' as const, label: 'Landscape', description: 'YouTube, Web' },
    { value: '9:16' as const, label: 'Portrait', description: 'TikTok, Instagram' },
    { value: '1:1' as const, label: 'Square', description: 'Social Posts' }
  ];

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      updateReferenceImage?.(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  return (
    <div className="space-y-6">
      {/* Story Input */}
      <div>
        <Label className="text-lg font-semibold">What's your story?</Label>
        <Textarea
          value={storyInput}
          onChange={(e) => updateStoryInput(e.target.value)}
          placeholder={`Examples:
• "Create a 15-second video about coffee brewing"
• "Make a 30-second product demo for our new eco-friendly packaging"
• "I need a 20-second video showing a superhero saving a cat"
• "A 45-second customer success story about XYZ Corp"

Tip: Mention desired video length in your prompt (3-60 seconds), or it will default to 30 seconds.`}
          rows={8}
          className="mt-2"
        />
      </div>

      {/* Aspect Ratio Selector */}
      <div>
        <Label className="text-lg font-semibold">Aspect Ratio</Label>
        <RadioGroup 
          value={aspectRatio} 
          onValueChange={updateAspectRatio}
        >
          <div className="grid grid-cols-3 gap-4 mt-2">
            {aspectRatios.map((ar) => (
              <Card 
                key={ar.value}
                className={cn(
                  "cursor-pointer transition-all hover:bg-muted/50",
                  aspectRatio === ar.value && "border-primary ring-2 ring-primary/20"
                )}
                onClick={() => updateAspectRatio(ar.value)}
              >
                <div className="flex items-center space-x-3 p-4">
                  <RadioGroupItem value={ar.value} id={`aspect-${ar.value}`} />
                  <Label htmlFor={`aspect-${ar.value}`} className="cursor-pointer flex-1">
                    <div className="font-medium">{ar.label}</div>
                    <div className="text-xs text-muted-foreground">{ar.description}</div>
                  </Label>
                </div>
              </Card>
            ))}
          </div>
        </RadioGroup>
      </div>

      {/* Reference Image Upload */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-lg font-semibold">Character/Product Image (Optional)</Label>
          <ReferenceImageGuide />
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Upload an image to maintain visual consistency across all scenes
        </p>

        {!referenceImage ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer",
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
            )}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="reference-image-upload"
            />
            <label htmlFor="reference-image-upload" className="cursor-pointer">
              <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">Click to upload or drag & drop</p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, WEBP up to 10MB
              </p>
            </label>
          </div>
        ) : (
          <div className="relative group">
            <img
              src={referenceImage}
              alt="Reference"
              className="w-full h-48 object-cover rounded-lg border"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => updateReferenceImage?.(undefined)}
            >
              <X className="w-4 h-4" />
            </Button>
            <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              Using VEO 3.1 Preview Model
            </div>
          </div>
        )}

        {referenceImage && (
          <Alert className="mt-3 border-primary/50 bg-primary/5">
            <Sparkles className="w-4 h-4 text-primary" />
            <AlertDescription>
              Premium+ model will be used ($0.15/5s) to ensure this character/product appears consistently
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* AI Suggestion */}
      <Alert className="border-primary/50 bg-primary/5">
        <Sparkles className="w-4 h-4 text-primary" />
        <AlertDescription>
          AI will automatically detect video duration from your prompt and divide it into optimized scenes
        </AlertDescription>
      </Alert>

      <Button 
        onClick={onNext} 
        size="lg" 
        className="w-full" 
        disabled={!storyInput.trim()}
      >
        Generate Story
      </Button>
    </div>
  );
}
