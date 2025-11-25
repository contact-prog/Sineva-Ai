import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, Upload, X, Sparkles } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { cn } from '@/lib/utils';

interface Platform {
  id: string;
  name: string;
  icon: string;
  category: 'social' | 'professional';
}

interface FormatOption {
  id: string;
  name: string;
  ratio: string;
  dimensions: string;
}

interface PlatformFormatSelection {
  [platformId: string]: string[];
}

const PLATFORMS: Platform[] = [
  { id: 'instagram', name: 'Instagram', icon: '📷', category: 'social' },
  { id: 'facebook', name: 'Facebook', icon: '👍', category: 'social' },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼', category: 'professional' },
  { id: 'twitter', name: 'Twitter/X', icon: '🐦', category: 'professional' },
  { id: 'pinterest', name: 'Pinterest', icon: '📌', category: 'social' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵', category: 'social' },
];

const PLATFORM_FORMATS: Record<string, FormatOption[]> = {
  instagram: [
    { id: 'ig-post', name: 'Post', ratio: '1:1', dimensions: '1080x1080' },
    { id: 'ig-story', name: 'Story', ratio: '9:16', dimensions: '1080x1920' },
    { id: 'ig-reel', name: 'Reel', ratio: '9:16', dimensions: '1080x1920' }
  ],
  facebook: [
    { id: 'fb-post', name: 'Post', ratio: '1:1', dimensions: '1200x1200' },
    { id: 'fb-story', name: 'Story', ratio: '9:16', dimensions: '1080x1920' },
    { id: 'fb-cover', name: 'Cover', ratio: '16:9', dimensions: '820x312' }
  ],
  linkedin: [
    { id: 'li-post', name: 'Post', ratio: '1:1', dimensions: '1200x1200' },
    { id: 'li-banner', name: 'Banner', ratio: '16:9', dimensions: '1584x396' }
  ],
  twitter: [
    { id: 'tw-post', name: 'Post', ratio: '16:9', dimensions: '1200x675' },
    { id: 'tw-header', name: 'Header', ratio: '3:1', dimensions: '1500x500' }
  ],
  pinterest: [
    { id: 'pin-standard', name: 'Pin', ratio: '2:3', dimensions: '1000x1500' },
    { id: 'pin-long', name: 'Long Pin', ratio: '9:16', dimensions: '1000x2100' }
  ],
  tiktok: [
    { id: 'tt-video', name: 'Video Cover', ratio: '9:16', dimensions: '1080x1920' }
  ]
};

const QUICK_PRESETS: Record<string, PlatformFormatSelection> = {
  'all-posts': {
    instagram: ['ig-post'],
    facebook: ['fb-post'],
    linkedin: ['li-post'],
    twitter: ['tw-post']
  },
  'all-stories': {
    instagram: ['ig-story'],
    facebook: ['fb-story'],
    tiktok: ['tt-video']
  },
  'professional': {
    linkedin: ['li-post', 'li-banner'],
    twitter: ['tw-post']
  }
};

interface GraphicSetupDialogProps {
  config?: any;
}

export default function GraphicSetupDialog({ config }: GraphicSetupDialogProps) {
  const { sendMessage, updateWorkflowConfig } = useChat();
  const [selectedFormats, setSelectedFormats] = useState<PlatformFormatSelection>(config?.selectedFormats || {});
  const [prompt, setPrompt] = useState(config?.prompt || '');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [includeLogo, setIncludeLogo] = useState(config?.includeLogo || false);
  const [quality, setQuality] = useState<'standard' | 'high'>(config?.quality || 'standard');
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [negativePrompt, setNegativePrompt] = useState(config?.negativePrompt || '');

  const togglePlatform = (platformId: string) => {
    if (selectedFormats[platformId]) {
      const updated = { ...selectedFormats };
      delete updated[platformId];
      setSelectedFormats(updated);
    } else {
      setSelectedFormats({
        ...selectedFormats,
        [platformId]: [PLATFORM_FORMATS[platformId][0].id]
      });
    }
  };

  const toggleFormat = (platformId: string, formatId: string) => {
    const current = selectedFormats[platformId] || [];
    const updated = current.includes(formatId)
      ? current.filter(id => id !== formatId)
      : [...current, formatId];
    
    setSelectedFormats({
      ...selectedFormats,
      [platformId]: updated
    });
  };

  const applyPreset = (presetKey: string) => {
    setSelectedFormats(QUICK_PRESETS[presetKey]);
  };

  const getTotalSelections = () => {
    return Object.values(selectedFormats).flat().length;
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (getTotalSelections() === 0) return;

    // Update workflow config
    await updateWorkflowConfig({
      selectedFormats,
      prompt,
      quality,
      includeLogo,
      negativePrompt,
      referenceImage: referenceImage?.name
    });

    // Send structured message to orchestrator
    const formatsList = Object.entries(selectedFormats)
      .map(([platform, formats]) => {
        const platformName = PLATFORMS.find(p => p.id === platform)?.name;
        const formatNames = formats.map(fId => {
          const format = PLATFORM_FORMATS[platform].find(f => f.id === fId);
          return `${format?.name} (${format?.dimensions})`;
        }).join(', ');
        return `${platformName}: ${formatNames}`;
      })
      .join(' | ');

    await sendMessage(
      `Generate graphic: "${prompt}" for ${formatsList}. Quality: ${quality}. Include logo: ${includeLogo}.`
    );
  };

  const isPlatformSelected = (platformId: string) => !!selectedFormats[platformId];

  return (
    <Card className="p-6 space-y-6 border-primary/20 bg-card/50">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Graphic Setup</h3>
        <Badge variant="secondary" className="ml-auto">
          {getTotalSelections()} format{getTotalSelections() !== 1 ? 's' : ''} selected
        </Badge>
      </div>

      {/* Quick Presets */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Quick Presets</Label>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => applyPreset('all-posts')}
            className="gap-2"
          >
            📱 All Posts
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => applyPreset('all-stories')}
            className="gap-2"
          >
            📖 All Stories
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => applyPreset('professional')}
            className="gap-2"
          >
            💼 Professional
          </Button>
        </div>
      </div>

      {/* Platform & Format Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Select Platforms & Formats</Label>
        <div className="space-y-2">
          {PLATFORMS.map((platform) => (
            <Card
              key={platform.id}
              className={cn(
                "p-3 transition-all cursor-pointer",
                isPlatformSelected(platform.id) 
                  ? "border-primary/50 bg-primary/5" 
                  : "border-border hover:border-primary/30"
              )}
            >
              {/* Platform Header */}
              <div 
                className="flex items-center gap-3"
                onClick={() => togglePlatform(platform.id)}
              >
                <Checkbox
                  checked={isPlatformSelected(platform.id)}
                  onCheckedChange={() => togglePlatform(platform.id)}
                />
                <span className="text-xl">{platform.icon}</span>
                <span className="font-medium">{platform.name}</span>
                {isPlatformSelected(platform.id) && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {selectedFormats[platform.id]?.length || 0} selected
                  </Badge>
                )}
              </div>

              {/* Format Options (shown when platform selected) */}
              {isPlatformSelected(platform.id) && (
                <div className="mt-3 ml-9 space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Select Formats:</p>
                  {PLATFORM_FORMATS[platform.id].map((format) => (
                    <div
                      key={format.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 transition-colors"
                      onClick={() => toggleFormat(platform.id, format.id)}
                    >
                      <Checkbox
                        checked={selectedFormats[platform.id]?.includes(format.id)}
                        onCheckedChange={() => toggleFormat(platform.id, format.id)}
                      />
                      <div className="flex-1 text-sm">
                        <span className="font-medium">{format.name}</span>
                        <span className="text-muted-foreground ml-2">
                          ({format.ratio} - {format.dimensions})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Prompt Input */}
      <div className="space-y-2">
        <Label htmlFor="prompt">Describe Your Graphic *</Label>
        <Textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="E.g., A vibrant sunset over mountains with inspirational quote"
          className="min-h-[100px]"
        />
      </div>

      {/* Advanced Options */}
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full justify-between"
        >
          Advanced Options
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform",
            showAdvanced && "rotate-180"
          )} />
        </Button>

        {showAdvanced && (
          <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/20">
            {/* Logo Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="logo">Include My Logo</Label>
                <p className="text-xs text-muted-foreground">Add your brand logo to graphics</p>
              </div>
              <Switch
                id="logo"
                checked={includeLogo}
                onCheckedChange={setIncludeLogo}
              />
            </div>

            {/* Quality Selection */}
            <div className="space-y-2">
              <Label>Quality</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={quality === 'standard' ? 'default' : 'outline'}
                  onClick={() => setQuality('standard')}
                  className="w-full"
                >
                  Standard (Faster)
                </Button>
                <Button
                  variant={quality === 'high' ? 'default' : 'outline'}
                  onClick={() => setQuality('high')}
                  className="w-full"
                >
                  High Quality
                </Button>
              </div>
            </div>

            {/* Reference Image */}
            <div className="space-y-2">
              <Label>Reference Image (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setReferenceImage(e.target.files?.[0] || null)}
                  className="flex-1"
                />
                {referenceImage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setReferenceImage(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Negative Prompt */}
            <div className="space-y-2">
              <Label htmlFor="negativePrompt">Negative Prompt (Optional)</Label>
              <Input
                id="negativePrompt"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="E.g., blurry, low quality, text"
              />
              <p className="text-xs text-muted-foreground">What to avoid in generation</p>
            </div>
          </div>
        )}
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={!prompt.trim() || getTotalSelections() === 0}
        className="w-full gap-2"
        size="lg"
      >
        <Sparkles className="h-4 w-4" />
        Generate Preview
      </Button>

      {getTotalSelections() === 0 && (
        <p className="text-xs text-center text-muted-foreground">
          Select at least one format to continue
        </p>
      )}
    </Card>
  );
}
