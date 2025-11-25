import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sparkles, Upload, Edit, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface FrameGeneratorProps {
  title: string;
  frameUrl: string | null;
  onFrameChange: (url: string) => void;
  aspectRatio: '16:9' | '9:16';
}

export const FrameGenerator = ({ title, frameUrl, onFrameChange, aspectRatio }: FrameGeneratorProps) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const dimensions = aspectRatio === '16:9' ? { width: 1024, height: 576 } : { width: 576, height: 1024 };

  const generateFrame = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('generate-frame-image', {
        body: { 
          prompt: `${prompt}. ${aspectRatio === '16:9' ? 'Landscape orientation, 16:9 aspect ratio' : 'Portrait orientation, 9:16 aspect ratio'}. High quality, detailed.`,
          width: dimensions.width,
          height: dimensions.height
        }
      });

      if (error) throw error;
      if (!data?.imageUrl) throw new Error('No image URL returned');

      onFrameChange(data.imageUrl);
      toast.success('Frame generated successfully!');
      setPrompt('');
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Failed to generate frame');
    } finally {
      setIsGenerating(false);
    }
  };

  const editFrame = async () => {
    if (!frameUrl || !editPrompt.trim()) {
      toast.error('Please enter editing instructions');
      return;
    }

    setIsEditing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('edit-frame-image', {
        body: { 
          imageUrl: frameUrl,
          prompt: editPrompt
        }
      });

      if (error) throw error;
      if (!data?.imageUrl) throw new Error('No image URL returned');

      onFrameChange(data.imageUrl);
      toast.success('Frame edited successfully!');
      setEditPrompt('');
      setShowEditDialog(false);
    } catch (error: any) {
      console.error('Edit error:', error);
      toast.error(error.message || 'Failed to edit frame');
    } finally {
      setIsEditing(false);
    }
  };

  const uploadFrame = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/frames/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(fileName);

      onFrameChange(publicUrl);
      toast.success('Frame uploaded successfully!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload frame');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFrame(file);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFrame(file);
  }, []);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {title}
            {frameUrl && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onFrameChange('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Frame Display / Drag-Drop Zone */}
          <div
            className={`relative rounded-lg border-2 border-dashed transition-colors ${
              isDragging ? 'border-primary bg-primary/10' : 'border-border'
            } ${frameUrl ? 'p-0' : 'p-8'}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {frameUrl ? (
              <div className="relative">
                <img 
                  src={frameUrl} 
                  alt={title} 
                  className="w-full rounded-lg"
                />
                <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 hover:opacity-100 bg-black/50 transition-opacity rounded-lg">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowEditDialog(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <label>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={isUploading}
                      asChild
                    >
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        Replace
                      </span>
                    </Button>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Drag & drop an image here</p>
                  <p className="text-xs text-muted-foreground">or generate one with AI below</p>
                </div>
                <label>
                  <Button variant="outline" disabled={isUploading} asChild>
                    <span>
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Image
                        </>
                      )}
                    </span>
                  </Button>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              </div>
            )}
          </div>

          {/* AI Generation Section */}
          <div className="space-y-2">
            <Label>Generate with AI (Gemini Pro Image)</Label>
            <div className="flex gap-2">
              <Textarea
                placeholder={`Describe the ${title.toLowerCase()} (e.g., "A person standing at the left side of frame looking right")`}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={2}
                className="flex-1"
              />
              <Button
                onClick={generateFrame}
                disabled={isGenerating || !prompt.trim()}
                className="self-end"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Frame</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Current Frame</Label>
              <img src={frameUrl || ''} alt="Current" className="mt-2 w-full rounded-lg" />
            </div>
            <div>
              <Label>Editing Instructions</Label>
              <Textarea
                placeholder="Describe the changes (e.g., 'Change background to sunset', 'Add motion blur')"
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                rows={3}
                className="mt-2"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={editFrame} disabled={isEditing || !editPrompt.trim()}>
                {isEditing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Editing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Apply Edit
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
