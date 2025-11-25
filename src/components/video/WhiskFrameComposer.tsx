import { useState, useRef } from 'react';
import { Upload, Wand2, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DraggableFrame } from './DraggableFrame';


interface WhiskImage {
  url: string | null;
  prompt: string;
  isGenerating: boolean;
}

interface WhiskFrameComposerProps {
  onDragStart: (imageUrl: string, frameType: 'start' | 'end') => void;
  onDragEnd: () => void;
  aspectRatio: string;
  subjectImage: WhiskImage;
  sceneImage: WhiskImage;
  styleImage: WhiskImage;
  compositeImages: Array<{ url: string; savedId: string | null; isSaving: boolean }>;
  isComposing: boolean;
  compositionPrompt: string;
  onSubjectImageChange: (image: WhiskImage) => void;
  onSceneImageChange: (image: WhiskImage) => void;
  onStyleImageChange: (image: WhiskImage) => void;
  onCompositeImagesChange: (images: Array<{ url: string; savedId: string | null; isSaving: boolean }>) => void;
  onIsComposingChange: (isComposing: boolean) => void;
  onCompositionPromptChange: (prompt: string) => void;
}

export function WhiskFrameComposer({ 
  onDragStart, 
  onDragEnd, 
  aspectRatio,
  subjectImage,
  sceneImage,
  styleImage,
  compositeImages,
  isComposing,
  compositionPrompt,
  onSubjectImageChange,
  onSceneImageChange,
  onStyleImageChange,
  onCompositeImagesChange,
  onIsComposingChange,
  onCompositionPromptChange
}: WhiskFrameComposerProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleFileUpload = async (type: 'subject' | 'scene' | 'style', file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to upload files');
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/whisk-inputs/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('brand-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('brand-assets')
        .getPublicUrl(filePath);

      const setterMap = { 
        subject: onSubjectImageChange, 
        scene: onSceneImageChange, 
        style: onStyleImageChange 
      };
      const currentImage = type === 'subject' ? subjectImage : type === 'scene' ? sceneImage : styleImage;
      setterMap[type]({ ...currentImage, url: publicUrl });
      
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} image uploaded`);
    } catch (error: any) {
      toast.error(`Failed to upload ${type} image: ${error.message}`);
    }
  };

  const handleGenerateImage = async (type: 'subject' | 'scene' | 'style') => {
    const imageMap = { subject: subjectImage, scene: sceneImage, style: styleImage };
    const setterMap = { 
      subject: onSubjectImageChange, 
      scene: onSceneImageChange, 
      style: onStyleImageChange 
    };
    const currentImage = imageMap[type];

    if (!currentImage.prompt.trim()) {
      toast.error(`Please enter a prompt for ${type}`);
      return;
    }

    setterMap[type]({ ...currentImage, isGenerating: true });

    try {
      const { data, error } = await supabase.functions.invoke('gemini-generate-image', {
        body: {
          prompt: currentImage.prompt,
          aspect: "1:1",
          frameGeneration: true
        }
      });

      if (error) throw error;
      if (!data?.imageUrl) throw new Error('No image URL returned');

      setterMap[type]({ ...currentImage, url: data.imageUrl, isGenerating: false });
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} image generated`);
    } catch (error: any) {
      toast.error(`Failed to generate ${type} image: ${error.message}`);
      setterMap[type]({ ...currentImage, isGenerating: false });
    }
  };

  const handleComposeFrame = async () => {
    const images = [subjectImage, sceneImage, styleImage].filter(img => img.url);
    
    if (images.length === 0) {
      toast.error('Please add at least one image (subject, scene, or style)');
      return;
    }

    abortControllerRef.current = new AbortController();
    onIsComposingChange(true);

    try {
      const { data, error } = await supabase.functions.invoke('gemini-edit-image', {
        body: {
          imageUrls: images.map(img => img.url),
          prompt: `${compositionPrompt} (Aspect ratio: ${aspectRatio})`,
          mode: 'compose'
        },
        signal: abortControllerRef.current.signal
      });

      if (error) throw error;
      if (!data?.imageUrl) throw new Error('No composite image returned');

      onCompositeImagesChange([...compositeImages, { url: data.imageUrl, savedId: null, isSaving: false }]);
      toast.success('Composite frame created! You can now drag it to Start or End frame.');
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast.info('Frame composition cancelled');
      } else {
        toast.error(`Failed to compose frame: ${error.message}`);
      }
    } finally {
      onIsComposingChange(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelCompose = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const handleSaveComposite = async (index: number) => {
    const frame = compositeImages[index];
    if (!frame || frame.savedId) return;

    onCompositeImagesChange(compositeImages.map((img, i) => i === index ? { ...img, isSaving: true } : img));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('brand_assets')
        .insert({
          user_id: user.id,
          asset_type: 'video_frame',
          title: 'Whisk Composite Frame',
          image_url: frame.url,
          metadata: {
            source: 'whisk_composer',
            composition: {
              subject: subjectImage.url ? { url: subjectImage.url, prompt: subjectImage.prompt } : null,
              scene: sceneImage.url ? { url: sceneImage.url, prompt: sceneImage.prompt } : null,
              style: styleImage.url ? { url: styleImage.url, prompt: styleImage.prompt } : null
            }
          }
        })
        .select()
        .single();

      if (error) throw error;

      onCompositeImagesChange(compositeImages.map((img, i) => i === index ? { ...img, savedId: data.id, isSaving: false } : img));
      toast.success('Composite frame saved to brand assets');
    } catch (error: any) {
      toast.error(`Failed to save composite: ${error.message}`);
      onCompositeImagesChange(compositeImages.map((img, i) => i === index ? { ...img, isSaving: false } : img));
    }
  };

  const renderImageSlot = (type: 'subject' | 'scene' | 'style') => {
    const imageMap = { subject: subjectImage, scene: sceneImage, style: styleImage };
    const image = imageMap[type];
    const setterMap = { 
      subject: onSubjectImageChange, 
      scene: onSceneImageChange, 
      style: onStyleImageChange 
    };

    return (
      <Card className="p-4 space-y-3">
        <Label className="text-sm font-medium capitalize">{type}</Label>
        
        {image.url ? (
          <div className="relative w-full h-32 rounded-lg overflow-hidden border-2 border-border">
            <img src={image.url} alt={type} className="w-full h-full object-cover" />
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-1 right-1 h-6 px-2 text-xs"
              onClick={() => setterMap[type]({ ...image, url: null })}
            >
              Remove
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Input
              placeholder={`Describe the ${type}...`}
              value={image.prompt}
              onChange={(e) => setterMap[type]({ ...image, prompt: e.target.value })}
            />
            <div className="flex flex-col gap-2 w-full">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => document.getElementById(`${type}-upload`)?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
              <Button
                variant="default"
                className="w-full"
                onClick={() => handleGenerateImage(type)}
                disabled={image.isGenerating || !image.prompt.trim()}
              >
                {image.isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            </div>
            <input
              id={`${type}-upload`}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(type, file);
              }}
            />
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {renderImageSlot('subject')}
        {renderImageSlot('scene')}
        {renderImageSlot('style')}
      </div>

      <Card className="p-4">
        <Label htmlFor="compositionPrompt" className="text-sm font-medium mb-2 block">
          Composition Instructions
        </Label>
        <Textarea
          id="compositionPrompt"
          placeholder="Describe how to blend the images..."
          value={compositionPrompt}
          onChange={(e) => onCompositionPromptChange(e.target.value)}
          rows={3}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground mt-2">
          Tell the AI how to compose the subject, scene, and style together
        </p>
      </Card>

      <div className="flex flex-col justify-center gap-3">
        <Button
          size="lg"
          className="w-full"
          onClick={handleComposeFrame}
          disabled={isComposing || ![subjectImage, sceneImage, styleImage].some(img => img.url)}
        >
          {isComposing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Composing Frame...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5 mr-2" />
              Compose Frame
            </>
          )}
        </Button>
        {isComposing && (
          <Button
            size="lg"
            className="w-full"
            variant="destructive"
            onClick={handleCancelCompose}
          >
            <X className="w-5 h-5 mr-2" />
            Cancel
          </Button>
        )}
      </div>

      {compositeImages.length > 0 && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Composed Frames ({compositeImages.length})</Label>
              <p className="text-sm text-muted-foreground">Click to preview, drag to Start or End zone</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {compositeImages.map((frame, index) => (
                <div key={`${frame.url}-${index}`} className="relative">
                  <div 
                    className="cursor-pointer"
                    onClick={() => setPreviewImage(frame.url)}
                  >
                    <DraggableFrame
                      imageUrl={frame.url}
                      frameType="start"
                      isSaved={!!frame.savedId}
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
                      onSave={frame.savedId ? undefined : () => handleSaveComposite(index)}
                      isSaving={frame.isSaving}
                      compact
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-2xl" aria-describedby="whisk-preview-description">
          <DialogTitle className="sr-only">Composed Frame Preview</DialogTitle>
          <DialogDescription id="whisk-preview-description" className="sr-only">
            Full size preview of the composed frame
          </DialogDescription>
          {previewImage && (
            <img 
              src={previewImage} 
              alt="Composed frame preview" 
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
