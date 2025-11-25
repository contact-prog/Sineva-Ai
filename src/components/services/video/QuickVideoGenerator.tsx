import { useState, useEffect } from "react";
import { FrameGenerator } from './FrameGenerator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Sparkles, Zap, Info, Upload, Image, Type, PlaySquare, Grid3x3 } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";

interface QuickVideoGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'text-to-video' | 'image-to-video' | 'frames-to-video' | 'scene-extension';
  baseVideoId?: string;
  baseVideoUrl?: string;
}

export const QuickVideoGenerator = ({ 
  isOpen, 
  onClose,
  initialMode = 'text-to-video',
  baseVideoId,
  baseVideoUrl: initialBaseVideoUrl
}: QuickVideoGeneratorProps) => {
  const navigate = useNavigate();
  
  // Core state
  const [mode, setMode] = useState<'text-to-video' | 'image-to-video' | 'frames-to-video' | 'scene-extension'>(initialMode);
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState<4 | 6 | 8>(6);
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [resolution, setResolution] = useState<"720p" | "1080p">("720p");
  const [quality, setQuality] = useState<"fast" | "standard">("fast");
  const [includeAudio, setIncludeAudio] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Reference media state
  const [referenceImageUrl, setReferenceImageUrl] = useState<string>("");
  const [firstFrameUrl, setFirstFrameUrl] = useState<string>("");
  const [lastFrameUrl, setLastFrameUrl] = useState<string>("");
  const [baseVideoUrl, setBaseVideoUrl] = useState<string>(initialBaseVideoUrl || "");
  const [originalVideoId, setOriginalVideoId] = useState<string>(baseVideoId || "");
  
  // File upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingFrame, setUploadingFrame] = useState<'first' | 'last' | null>(null);

  // Gallery state
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [completedVideos, setCompletedVideos] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setBaseVideoUrl(initialBaseVideoUrl || "");
      setOriginalVideoId(baseVideoId || "");
      
      // Load completed videos for gallery
      loadCompletedVideos();
    }
  }, [isOpen, initialMode, baseVideoId, initialBaseVideoUrl]);

  const loadCompletedVideos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('video_generations')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .not('video_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setCompletedVideos(data || []);
    } catch (error) {
      console.error('Error loading videos:', error);
    }
  };

  const handleImageUpload = async (file: File, type: 'reference' | 'first-frame' | 'last-frame') => {
    try {
      if (type === 'first-frame') setUploadingFrame('first');
      else if (type === 'last-frame') setUploadingFrame('last');
      else setUploadingImage(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${type}-${Date.now()}.${fileExt}`;
      const filePath = `quick-video/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(filePath);

      if (type === 'reference') setReferenceImageUrl(publicUrl);
      else if (type === 'first-frame') setFirstFrameUrl(publicUrl);
      else if (type === 'last-frame') setLastFrameUrl(publicUrl);

      toast.success("Image uploaded successfully");
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
      setUploadingFrame(null);
    }
  };

  const selectBaseVideo = (video: any) => {
    setBaseVideoUrl(video.video_url);
    setOriginalVideoId(video.id);
    setShowGalleryPicker(false);
    toast.success("Video selected for extension");
  };

  const calculateCost = () => {
    let costPerSecond: number;
    if (quality === 'fast') {
      costPerSecond = includeAudio ? 0.40 : 0.25;
    } else {
      costPerSecond = includeAudio ? 0.75 : 0.50;
    }
    return (costPerSecond * duration).toFixed(2);
  };

  const getGenerationTime = () => {
    return quality === 'fast' ? '45-60 seconds' : '90-180 seconds';
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    // Mode-specific validations
    if (mode === 'image-to-video' && !referenceImageUrl) {
      toast.error("Please upload a reference image");
      return;
    }

    if (mode === 'frames-to-video' && (!firstFrameUrl || !lastFrameUrl)) {
      toast.error("Please upload both start and end frames");
      return;
    }

    if (mode === 'scene-extension' && !baseVideoUrl) {
      toast.error("Please select a video to extend");
      return;
    }

    try {
      setIsGenerating(true);

      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        'generate-video-quick',
        {
          body: {
            prompt: prompt.trim(),
            generationMode: mode,
            duration,
            aspectRatio,
            resolution,
            quality,
            includeAudio,
            referenceImageUrl: mode === 'image-to-video' ? referenceImageUrl : undefined,
            firstFrameUrl: mode === 'frames-to-video' ? firstFrameUrl : undefined,
            lastFrameUrl: mode === 'frames-to-video' ? lastFrameUrl : undefined,
            baseVideoUrl: mode === 'scene-extension' ? baseVideoUrl : undefined,
            originalVideoId: mode === 'scene-extension' ? originalVideoId : undefined
          }
        }
      );

      if (functionError) {
        console.error('Edge function error:', functionError);
        throw new Error(functionError.message || 'Failed to start video generation');
      }

      const videoId = functionData?.videoId;
      if (!videoId) {
        throw new Error('No video ID returned from generation');
      }

      // Navigate to video result instead of closing
      navigate(`/app/video-result?id=${videoId}`);
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || "Failed to start video generation");
    } finally {
      setIsGenerating(false);
    }
  };

  const getPromptTemplate = () => {
    const templates = {
      'text-to-video': 'A cinematic shot of [subject] with [camera movement]...',
      'image-to-video': 'Animate this image with [describe motion]...',
      'frames-to-video': 'Smooth transition from start to end with [describe transition]...',
      'scene-extension': 'Continue the video by [describe what happens next]...'
    };
    return templates[mode];
  };

  return (
    <>
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Video Generator
            <Badge variant="secondary">VEO 3.1</Badge>
          </CardTitle>
          <CardDescription>
            Generate professional videos in seconds with VEO 3.1
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
            {/* Generation Mode Tabs */}
            <Tabs value={mode} onValueChange={(v: any) => setMode(v)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="text-to-video" className="gap-2">
                  <Type className="h-4 w-4" />
                  Text
                </TabsTrigger>
                <TabsTrigger value="image-to-video" className="gap-2">
                  <Image className="h-4 w-4" />
                  Image
                </TabsTrigger>
                <TabsTrigger value="frames-to-video" className="gap-2">
                  <Grid3x3 className="h-4 w-4" />
                  Frames
                </TabsTrigger>
                <TabsTrigger value="scene-extension" className="gap-2">
                  <PlaySquare className="h-4 w-4" />
                  Extend
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text-to-video" className="space-y-4 mt-4">
                <div>
                  <Label>Video Prompt</Label>
                  <Textarea
                    placeholder={getPromptTemplate()}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    className="mt-2"
                  />
                </div>
              </TabsContent>

              <TabsContent value="image-to-video" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Reference Image</CardTitle>
                    <CardDescription>Upload an image to animate</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'reference')}
                      disabled={uploadingImage}
                    />
                    {uploadingImage && <p className="text-sm text-muted-foreground mt-2">Uploading...</p>}
                    {referenceImageUrl && (
                      <img src={referenceImageUrl} alt="Reference" className="mt-4 max-h-48 rounded-lg" />
                    )}
                  </CardContent>
                </Card>
                <div>
                  <Label>Animation Prompt (Optional)</Label>
                  <Textarea
                    placeholder={getPromptTemplate()}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={3}
                    className="mt-2"
                  />
                </div>
              </TabsContent>

              <TabsContent value="frames-to-video" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FrameGenerator
                    title="Start Frame"
                    frameUrl={firstFrameUrl}
                    onFrameChange={setFirstFrameUrl}
                    aspectRatio={aspectRatio}
                  />
                  <FrameGenerator
                    title="End Frame"
                    frameUrl={lastFrameUrl}
                    onFrameChange={setLastFrameUrl}
                    aspectRatio={aspectRatio}
                  />
                </div>
                <div>
                  <Label>Transition Prompt</Label>
                  <Textarea
                    placeholder={getPromptTemplate()}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={3}
                    className="mt-2"
                  />
                </div>
              </TabsContent>

              <TabsContent value="scene-extension" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Base Video</CardTitle>
                    <CardDescription>Select a video to extend</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowGalleryPicker(true)}
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose from Gallery
                    </Button>
                    {baseVideoUrl && (
                      <video src={baseVideoUrl} controls className="w-full rounded-lg" />
                    )}
                  </CardContent>
                </Card>
                <div>
                  <Label>Extension Prompt</Label>
                  <Textarea
                    placeholder={getPromptTemplate()}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={3}
                    className="mt-2"
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* Video Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duration</Label>
                <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v) as 4 | 6 | 8)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4 seconds</SelectItem>
                    <SelectItem value="6">6 seconds</SelectItem>
                    <SelectItem value="8">8 seconds</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Aspect Ratio</Label>
                <Select value={aspectRatio} onValueChange={(v: any) => setAspectRatio(v)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                    <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Resolution</Label>
                <Select value={resolution} onValueChange={(v: any) => setResolution(v)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="720p">720p (HD)</SelectItem>
                    <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  Quality
                  <HoverCard>
                    <HoverCardTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Feature</TableHead>
                            <TableHead>Fast</TableHead>
                            <TableHead>Standard</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell>Speed</TableCell>
                            <TableCell>45-60s</TableCell>
                            <TableCell>90-180s</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Cost (6s + audio)</TableCell>
                            <TableCell>$2.40</TableCell>
                            <TableCell>$4.50</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Quality</TableCell>
                            <TableCell>Good</TableCell>
                            <TableCell>Superior</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </HoverCardContent>
                  </HoverCard>
                </Label>
                <Select value={quality} onValueChange={(v: any) => setQuality(v)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fast">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Fast Mode
                      </div>
                    </SelectItem>
                    <SelectItem value="standard">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Standard Mode
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Audio Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Generate Audio</Label>
                <p className="text-sm text-muted-foreground">VEO 3.1 will generate matching sound effects</p>
              </div>
              <Switch checked={includeAudio} onCheckedChange={setIncludeAudio} />
            </div>

            {/* Cost Display */}
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Base Cost ({duration}s):</span>
                    <span className="font-medium">${calculateCost()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Resolution ({resolution}):</span>
                    <span>Included</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Audio:</span>
                    <span>{includeAudio ? 'Included' : 'Disabled'}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total:</span>
                    <span>${calculateCost()}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Estimated time: {getGenerationTime()}
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Video
                </>
              )}
            </Button>
        </CardContent>
      </Card>

      {/* Gallery Picker Modal */}
      <Dialog open={showGalleryPicker} onOpenChange={setShowGalleryPicker}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose a Video to Extend</DialogTitle>
            <DialogDescription>
              Select a completed video from your gallery to extend
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4">
            {completedVideos.map(video => (
              <Card 
                key={video.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => selectBaseVideo(video)}
              >
                <video src={video.video_url} className="w-full aspect-video rounded-t-lg" />
                <CardContent className="p-3">
                  <p className="text-sm font-medium line-clamp-1">{video.prompt}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary">{video.duration_seconds}s</Badge>
                    {video.is_extension && (
                      <Badge variant="outline">Extension</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {completedVideos.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No completed videos found. Generate some videos first!
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
