import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Upload, X } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';

export default function AdvancedOptionsForm() {
  const { sendMessage } = useChat();
  const [prompt, setPrompt] = useState('');
  const [includeLogo, setIncludeLogo] = useState(false);
  const [quality, setQuality] = useState<'standard' | 'high'>('standard');
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [negativePrompt, setNegativePrompt] = useState('');

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    
    const options = [];
    options.push(`Prompt: "${prompt}"`);
    options.push(`Quality: ${quality}`);
    options.push(`Include logo: ${includeLogo}`);
    if (negativePrompt) options.push(`Avoid: ${negativePrompt}`);
    if (referenceImage) options.push(`Reference image: ${referenceImage.name}`);
    
    sendMessage(`Generate preview with these settings:\n${options.join('\n')}`);
  };

  return (
    <Card className="p-4 border-primary/20 bg-card/50 space-y-4">
      <h3 className="font-semibold">Advanced Options</h3>
      
      <div className="space-y-2">
        <Label htmlFor="prompt">Describe Your Graphic *</Label>
        <Textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="E.g., A vibrant sunset over mountains with inspirational quote"
          className="min-h-[80px]"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label htmlFor="logo">Include My Logo</Label>
          <p className="text-xs text-muted-foreground">Add your brand logo</p>
        </div>
        <Switch
          id="logo"
          checked={includeLogo}
          onCheckedChange={setIncludeLogo}
        />
      </div>

      <div className="space-y-2">
        <Label>Quality</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={quality === 'standard' ? 'default' : 'outline'}
            onClick={() => setQuality('standard')}
            size="sm"
          >
            Standard
          </Button>
          <Button
            variant={quality === 'high' ? 'default' : 'outline'}
            onClick={() => setQuality('high')}
            size="sm"
          >
            High Quality
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Reference Image (Optional)</Label>
        <div className="flex gap-2">
          {!referenceImage ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => document.getElementById('ref-image')?.click()}
            >
              <Upload className="h-4 w-4" />
              Upload Image
            </Button>
          ) : (
            <div className="flex items-center gap-2 flex-1 px-3 py-2 border rounded-md">
              <span className="text-sm truncate">{referenceImage.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setReferenceImage(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          <input
            id="ref-image"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setReferenceImage(e.target.files?.[0] || null)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="negativePrompt">Negative Prompt (Optional)</Label>
        <Input
          id="negativePrompt"
          value={negativePrompt}
          onChange={(e) => setNegativePrompt(e.target.value)}
          placeholder="E.g., blurry, low quality"
        />
      </div>

      <Button
        onClick={handleGenerate}
        disabled={!prompt.trim()}
        className="w-full"
        size="sm"
      >
        Generate Preview
      </Button>
    </Card>
  );
}
