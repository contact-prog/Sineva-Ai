import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useChat } from '@/contexts/ChatContext';
import { Smartphone, Monitor, Video, Loader2, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const DURATIONS = [
  { value: 4, label: '4 sec', description: 'Quick' },
  { value: 6, label: '6 sec', description: 'Standard' },
  { value: 8, label: '8 sec', description: 'Extended' },
];

const QUALITY_OPTIONS = [
  { value: 'fast', label: 'Fast', description: '45-60 seconds' },
  { value: 'standard', label: 'Best Quality', description: '90-180 seconds' },
];

export default function VideoPlatformSelector() {
  const { activeWorkflow, startVideoGeneration } = useChat();
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [duration, setDuration] = useState(6);
  const [quality, setQuality] = useState<'fast' | 'standard'>('fast');
  const [referenceImageUrl, setReferenceImageUrl] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleReferenceUpload = async (file: File) => {
    try {
      setIsUploadingImage(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/reference-${Date.now()}.${fileExt}`;
      const filePath = `video-references/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(filePath);

      setReferenceImageUrl(publicUrl);
      toast.success("Reference image uploaded");
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || "Failed to upload image");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleGenerate = async () => {
    if (!activeWorkflow || !activeWorkflow.config?.prompt) {
      toast.error("Missing video prompt");
      return;
    }
    
    setIsGenerating(true);
    
    try {
      await startVideoGeneration({
        platforms: aspectRatio === '9:16' ? ['phone'] : ['screen'], // Simple platform mapping
        duration,
        quality,
        aspectRatio,
        referenceImageUrl: referenceImageUrl || undefined
      });
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || "Failed to start video generation");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="p-6 space-y-6 bg-card border-border/30">
      <div>
        <h3 className="font-semibold text-lg mb-2">Configure Your Video</h3>
        <p className="text-sm text-muted-foreground">
          Choose video settings for generation
        </p>
      </div>

      {/* Device Orientation Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Video Orientation</Label>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant={aspectRatio === '9:16' ? 'default' : 'outline'}
            onClick={() => setAspectRatio('9:16')}
            className="h-auto py-4 flex-col gap-2"
          >
            <Smartphone className="h-5 w-5" />
            <div className="text-center">
              <div className="font-semibold">Phone</div>
              <div className="text-xs opacity-80">9:16 Portrait</div>
            </div>
          </Button>
          <Button
            variant={aspectRatio === '16:9' ? 'default' : 'outline'}
            onClick={() => setAspectRatio('16:9')}
            className="h-auto py-4 flex-col gap-2"
          >
            <Monitor className="h-5 w-5" />
            <div className="text-center">
              <div className="font-semibold">Screens</div>
              <div className="text-xs opacity-80">16:9 Landscape</div>
            </div>
          </Button>
        </div>
      </div>

      {/* Duration Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Video Duration</Label>
        <div className="flex gap-2">
          {DURATIONS.map((dur) => (
            <Button
              key={dur.value}
              variant={duration === dur.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDuration(dur.value)}
              className="flex-1 flex-col h-auto py-3"
            >
              <span className="font-semibold">{dur.label}</span>
              <span className="text-xs opacity-80">{dur.description}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Model Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Model (VEO 3.1)</Label>
        <div className="grid grid-cols-2 gap-2">
          {QUALITY_OPTIONS.map((q) => (
            <Button
              key={q.value}
              variant={quality === q.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setQuality(q.value as 'fast' | 'standard')}
              className="flex-col h-auto py-3"
            >
              <span className="font-semibold">{q.label}</span>
              <span className="text-xs opacity-80">{q.description}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Reference Image Upload (Optional) */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Reference Image (Optional)</Label>
        {referenceImageUrl ? (
          <div className="relative">
            <img 
              src={referenceImageUrl} 
              alt="Reference" 
              className="w-full h-32 object-cover rounded-lg border border-border"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6"
              onClick={() => setReferenceImageUrl('')}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="relative">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleReferenceUpload(e.target.files[0])}
              disabled={isUploadingImage}
              className="cursor-pointer"
            />
            {isUploadingImage && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-md">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Upload an image to guide the video generation
        </p>
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating Video...
          </>
        ) : (
          <>
            <Video className="h-4 w-4 mr-2" />
            Generate Video
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Simple text-to-video with VEO 3.1 AI
      </p>
    </Card>
  );
}
