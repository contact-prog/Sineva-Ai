import { useState, useEffect } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Wand2, Loader2, Download, CheckCircle2, 
  Info, Sparkles, ArrowLeft, ChevronDown, Upload, X, Send
} from 'lucide-react';
import { toast } from 'sonner';

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

export default function Graphics() {
  const { setCurrentService } = useChat();
  const [selectedFormats, setSelectedFormats] = useState<PlatformFormatSelection>({});
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [quality, setQuality] = useState<'fast' | 'standard' | 'premium'>('standard');
  const [includeLogo, setIncludeLogo] = useState(false);
  const [hasLogo, setHasLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'social' | 'professional'>('all');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditGenerating, setIsEditGenerating] = useState(false);
  
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [finalGenerations, setFinalGenerations] = useState<any[]>([]);

  useEffect(() => {
    setCurrentService('graphics');
    loadBrandKit();
  }, [setCurrentService]);

  const loadBrandKit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('logo_url')
        .eq('id', user.id)
        .single();

      if (profile?.logo_url) {
        setHasLogo(true);
        setLogoUrl(profile.logo_url);
      }
    } catch (error) {
      console.error('Error loading brand kit:', error);
    }
  };

  const handleReferenceImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReferenceImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferenceImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeReferenceImage = () => {
    setReferenceImage(null);
    setReferenceImageUrl(null);
  };

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
    
    if (updated.length === 0) {
      const newFormats = { ...selectedFormats };
      delete newFormats[platformId];
      setSelectedFormats(newFormats);
    } else {
      setSelectedFormats({
        ...selectedFormats,
        [platformId]: updated
      });
    }
  };

  const getTotalSelections = () => {
    return Object.values(selectedFormats).flat().length;
  };

  const getFirstSelectedFormat = () => {
    for (const platformId of Object.keys(selectedFormats)) {
      const formatIds = selectedFormats[platformId];
      if (formatIds.length > 0) {
        const format = PLATFORM_FORMATS[platformId].find(f => f.id === formatIds[0]);
        return format;
      }
    }
    return null;
  };

  const handleQuickSelect = (presetKey: 'all-posts' | 'all-stories' | 'professional') => {
    setSelectedFormats(QUICK_PRESETS[presetKey]);
  };

  const handleGeneratePreview = async () => {
    if (!prompt.trim()) {
      toast.error('Please describe what you want to create');
      return;
    }

    if (getTotalSelections() === 0) {
      toast.error('Please select at least one platform and format');
      return;
    }

    if (includeLogo && !hasLogo) {
      toast.error('No logo found in Brand Kit. Upload one or disable "Include Logo"');
      return;
    }

    setIsGeneratingPreview(true);
    setPreview(null);

    try {
      const firstFormat = getFirstSelectedFormat();
      const firstPlatform = Object.keys(selectedFormats)[0];

      const { data, error } = await supabase.functions.invoke('generate-graphic', {
        body: {
          platforms: [firstPlatform],
          contentTypes: { [firstPlatform]: 'feed-post' },
          prompt: prompt,
          negativePrompt: negativePrompt || undefined,
          referenceImage: referenceImageUrl || undefined,
          quality: quality,
          includeLogo: includeLogo,
          previewMode: true,
          dimensions: firstFormat?.dimensions || '1080x1080',
          aspectRatio: firstFormat?.ratio || '1:1'
        }
      });

      if (error) throw error;

      setPreview(data.preview);
      toast.success(`Preview generated for ${firstFormat?.name || 'first format'}!`, {
        description: data.reason
      });
    } catch (error) {
      console.error('Error generating preview:', error);
      toast.error('Failed to generate preview. Please try again.');
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const handleEditGraphic = async () => {
    if (!editPrompt.trim() || !preview) {
      toast.error('Please describe what changes you want to make');
      return;
    }

    setIsEditGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('edit-graphic', {
        body: {
          imageUrl: preview.image_url,
          editPrompt: editPrompt,
          originalPrompt: prompt,
          negativePrompt: negativePrompt || undefined,
          quality: quality,
          includeLogo: includeLogo
        }
      });

      if (error) throw error;

      // Update preview with edited version
      setPreview({
        ...preview,
        image_url: data.editedImageUrl
      });
      
      setEditPrompt('');
      toast.success('Graphic updated and saved to media library!');
    } catch (error) {
      console.error('Error editing graphic:', error);
      toast.error('Failed to edit graphic. Please try again.');
    } finally {
      setIsEditGenerating(false);
    }
  };

  const handleGenerateForAllPlatforms = async () => {
    if (!preview) return;

    setIsBatchGenerating(true);
    setFinalGenerations([]);

    try {
      const generationTasks = [];
      
      for (const [platformId, formatIds] of Object.entries(selectedFormats)) {
        for (const formatId of formatIds) {
          const format = PLATFORM_FORMATS[platformId].find(f => f.id === formatId);
          if (format) {
            generationTasks.push({
              platform: platformId,
              formatId: formatId,
              dimensions: format.dimensions,
              aspectRatio: format.ratio,
              formatName: format.name
            });
          }
        }
      }

      const allGenerations = [];

      for (const task of generationTasks) {
        const { data, error } = await supabase.functions.invoke('generate-graphic', {
          body: {
            platforms: [task.platform],
            contentTypes: { [task.platform]: 'feed-post' },
            prompt: prompt,
            negativePrompt: negativePrompt || undefined,
            referenceImage: referenceImageUrl || undefined,
            quality: quality,
            includeLogo: includeLogo,
            previewMode: false,
            approvedPreviewId: preview.id,
            dimensions: task.dimensions,
            aspectRatio: task.aspectRatio
          }
        });

        if (!error && data.generations) {
          allGenerations.push(...data.generations.map((gen: any) => ({
            ...gen,
            formatName: task.formatName
          })));
        }
      }

      setFinalGenerations(allGenerations);
      toast.success(`Successfully generated ${allGenerations.length} graphics!`);
    } catch (error) {
      console.error('Error batch generating:', error);
      toast.error('Failed to generate for all platforms');
    } finally {
      setIsBatchGenerating(false);
    }
  };

  const handleDownload = async (imageUrl: string, platform: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${platform}_graphic_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Downloaded!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download');
    }
  };

  const handleStartOver = () => {
    setPreview(null);
    setFinalGenerations([]);
    setPrompt('');
    setIsEditing(false);
    setEditPrompt('');
  };

  const filteredPlatforms = PLATFORMS.filter(p => 
    activeTab === 'all' ? true : p.category === activeTab
  );

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <div className="glass-card p-6 border-l-4 border-primary">
        <h1 className="text-3xl font-bold">AI Graphic Generator</h1>
        <p className="text-muted-foreground mt-2">
          Create stunning social media graphics with intelligent AI
        </p>
      </div>

      {!preview && !finalGenerations.length && (
        <Card className="glass-card border-primary/20">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Sparkles className="w-6 h-6 text-primary" />
              Create Your Graphic
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Step 1: Platform & Format Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-lg font-semibold">Step 1: Choose Platforms & Formats</Label>
                  {getTotalSelections() > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {getTotalSelections()} format{getTotalSelections() !== 1 ? 's' : ''} selected across {Object.keys(selectedFormats).length} platform{Object.keys(selectedFormats).length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickSelect('all-posts')}
                  >
                    All Posts
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickSelect('all-stories')}
                  >
                    All Stories
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickSelect('professional')}
                  >
                    Professional
                  </Button>
                </div>
              </div>

              {/* Platform Selection with Formats */}
              <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">All Platforms</TabsTrigger>
                  <TabsTrigger value="social">Social Media</TabsTrigger>
                  <TabsTrigger value="professional">Professional</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-4 space-y-3">
                  {filteredPlatforms.map((platform) => {
                    const isSelected = !!selectedFormats[platform.id];
                    const selectedFormatIds = selectedFormats[platform.id] || [];
                    const formats = PLATFORM_FORMATS[platform.id] || [];

                    return (
                      <Card key={platform.id} className={`overflow-hidden transition-all ${isSelected ? 'border-primary' : ''}`}>
                        <div 
                          className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50"
                          onClick={() => togglePlatform(platform.id)}
                        >
                          <Checkbox checked={isSelected} />
                          <span className="text-2xl">{platform.icon}</span>
                          <span className="font-semibold flex-1">{platform.name}</span>
                          {isSelected && (
                            <Badge variant="secondary">
                              {selectedFormatIds.length} format{selectedFormatIds.length !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        
                        {isSelected && (
                          <div className="px-4 pb-4 pt-2 border-t bg-muted/20">
                            <Label className="text-sm text-muted-foreground mb-2 block">Select formats:</Label>
                            <div className="flex flex-wrap gap-2">
                              {formats.map((format) => {
                                const isFormatSelected = selectedFormatIds.includes(format.id);
                                return (
                                  <div
                                    key={format.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleFormat(platform.id, format.id);
                                    }}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-all ${
                                      isFormatSelected 
                                        ? 'border-primary bg-primary/10' 
                                        : 'border-border hover:border-primary/50 hover:bg-muted'
                                    }`}
                                  >
                                    <Checkbox checked={isFormatSelected} />
                                    <div>
                                      <div className="text-sm font-medium">{format.name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {format.ratio} · {format.dimensions}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </TabsContent>
              </Tabs>
            </div>

            {/* Step 2: Prompt Input */}
            <div className="space-y-3">
              <Label className="text-lg font-semibold">Step 2: Describe Your Graphic</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="E.g., 'Product launch announcement for wireless headphones with modern tech aesthetic, vibrant colors, professional look'"
                rows={4}
                className="resize-none text-base"
              />
              <p className="text-xs text-muted-foreground">
                💡 Tip: Be specific about style, colors, mood, and key elements you want
              </p>
            </div>

            {/* Step 3: Advanced Options */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <div className="space-y-4 p-5 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">Step 3: Advanced Options</Label>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                </div>

                {/* Logo Option - Always Visible */}
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="include-logo"
                    checked={includeLogo}
                    onCheckedChange={(checked) => setIncludeLogo(checked as boolean)}
                  />
                  <div className="flex-1">
                    <Label htmlFor="include-logo" className="cursor-pointer font-medium">
                      Include my logo (from Brand Kit)
                    </Label>
                    {!hasLogo && (
                      <p className="text-sm text-muted-foreground mt-1">
                        No logo found. <button onClick={() => window.open('/app/brand-kit', '_blank')} className="underline text-primary cursor-pointer">Upload one in Brand Kit</button>
                      </p>
                    )}
                    {hasLogo && logoUrl && includeLogo && (
                      <div className="mt-3 flex items-center gap-3 p-3 bg-background rounded-md border">
                        <img src={logoUrl} alt="Logo" className="w-12 h-12 object-contain" />
                        <span className="text-sm text-muted-foreground">
                          ✨ Logo will be intelligently placed based on content
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <CollapsibleContent className="space-y-4">
                  {/* Reference Image Upload */}
                  <div className="space-y-3">
                    <Label className="font-medium">Reference Image (Optional)</Label>
                    <div className="flex items-center gap-3">
                      {!referenceImageUrl ? (
                        <Label htmlFor="reference-upload" className="cursor-pointer">
                          <div className="flex items-center gap-2 p-3 rounded-md border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors">
                            <Upload className="w-4 h-4" />
                            <span className="text-sm">Upload reference image</span>
                          </div>
                          <Input
                            id="reference-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleReferenceImageChange}
                            className="hidden"
                          />
                        </Label>
                      ) : (
                        <div className="relative">
                          <img src={referenceImageUrl} alt="Reference" className="w-32 h-32 object-cover rounded-md border" />
                          <Button
                            size="icon"
                            variant="destructive"
                            className="absolute -top-2 -right-2 h-6 w-6"
                            onClick={removeReferenceImage}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Upload an image to guide the style, composition, or subject
                    </p>
                  </div>

                  {/* Negative Prompt */}
                  <div className="space-y-3">
                    <Label className="font-medium">Negative Prompt (Optional)</Label>
                    <Textarea
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      placeholder="E.g., 'blurry, low quality, watermark, text, cluttered'"
                      rows={2}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Describe what you DON'T want in the image
                    </p>
                  </div>

                  {/* Quality Settings */}
                  <div className="space-y-3">
                    <Label className="font-medium">Quality</Label>
                    <RadioGroup value={quality} onValueChange={(v: any) => setQuality(v)} className="space-y-2">
                      <div className="flex items-center space-x-3 p-3 rounded-md border bg-background hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value="fast" id="fast" />
                        <Label htmlFor="fast" className="cursor-pointer flex-1">
                          <div className="font-medium">Fast</div>
                          <div className="text-xs text-muted-foreground">Good quality, quick generation (~5-10s)</div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 rounded-md border bg-background hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value="standard" id="standard" />
                        <Label htmlFor="standard" className="cursor-pointer flex-1">
                          <div className="font-medium">Standard</div>
                          <div className="text-xs text-muted-foreground">Better quality, balanced speed (~15-20s)</div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 rounded-md border bg-background hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value="premium" id="premium" />
                        <Label htmlFor="premium" className="cursor-pointer flex-1">
                          <div className="font-medium">Premium</div>
                          <div className="text-xs text-muted-foreground">Best quality, slower generation (~30-40s)</div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            <Button
              onClick={handleGeneratePreview}
              disabled={isGeneratingPreview || !prompt || getTotalSelections() === 0}
              className="w-full h-12 text-base"
              size="lg"
            >
              {isGeneratingPreview ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating Preview...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate Preview
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {preview && !finalGenerations.length && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" />
              Preview Generated
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1">
                <img
                  src={preview.image_url}
                  alt="Preview"
                  className="w-full rounded-lg border shadow-lg"
                />
                <div className="flex gap-2 mt-4 flex-wrap">
                  <Badge variant="secondary">{preview.platform}</Badge>
                  <Badge variant="secondary">{preview.dimensions}</Badge>
                  <Badge variant="outline">Gemini 3 Pro Image</Badge>
                </div>
              </div>

              <div className="w-full lg:w-96 space-y-4">
                {/* Conversational Editing */}
                <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
                  <Label className="font-semibold">✨ Refine Your Graphic</Label>
                  <p className="text-sm text-muted-foreground">
                    Make changes using natural language
                  </p>
                  <div className="space-y-2">
                    <Textarea
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      placeholder="E.g., 'Make logo bigger', 'Change background to blue', 'Add more contrast'"
                      rows={3}
                      className="resize-none"
                    />
                    <Button
                      onClick={handleEditGraphic}
                      disabled={isEditGenerating || !editPrompt.trim()}
                      className="w-full"
                      variant="secondary"
                    >
                      {isEditGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Editing...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Apply Changes
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button
                    onClick={handleGenerateForAllPlatforms}
                    disabled={isBatchGenerating}
                    className="w-full"
                    size="lg"
                  >
                    {isBatchGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Generate for All Platforms
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleStartOver}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Start Over
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {finalGenerations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">All Graphics Ready! 🎉</h2>
            <Button variant="outline" onClick={handleStartOver}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Create New
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {finalGenerations.map((gen) => (
              <Card key={gen.id}>
                <div className="relative aspect-square">
                  <img
                    src={gen.image_url}
                    alt={gen.platform}
                    className="w-full h-full object-cover rounded-t-lg"
                  />
                  <Badge className="absolute top-2 left-2">{gen.platform}</Badge>
                  <Badge className="absolute top-2 right-2" variant="secondary">
                    {gen.formatName || gen.dimensions}
                  </Badge>
                </div>
                <CardContent className="pt-4">
                  <div className="text-xs text-muted-foreground mb-2">
                    {gen.dimensions}
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleDownload(gen.image_url, `${gen.platform}-${gen.formatName || 'graphic'}`)}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
