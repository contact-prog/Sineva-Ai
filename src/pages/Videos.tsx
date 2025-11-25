import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Video, Sparkles, Loader2, Download, GripVertical, ImagePlus } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DraggableFrame } from '@/components/video/DraggableFrame';
import { FrameDropZone } from '@/components/video/FrameDropZone';
import { WhiskFrameComposer } from '@/components/video/WhiskFrameComposer';
import { useChat } from '@/contexts/ChatContext';

export default function Videos() {
  const { toast } = useToast();
  const { setCurrentService } = useChat();

  useEffect(() => {
    setCurrentService('videos');
  }, [setCurrentService]);
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [duration, setDuration] = useState('8');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [model, setModel] = useState('veo-3.1-generate-preview');
  const [image, setImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [videoId, setVideoId] = useState<string | null>(null);

  // Frame-to-Video state
  const [startFramePrompt, setStartFramePrompt] = useState('');
  const [endFramePrompt, setEndFramePrompt] = useState('');
  const [generatedStartFrame, setGeneratedStartFrame] = useState<string | null>(null);
  const [generatedEndFrame, setGeneratedEndFrame] = useState<string | null>(null);
  const [isGeneratingFrames, setIsGeneratingFrames] = useState(false);
  const [isGeneratingStartFrame, setIsGeneratingStartFrame] = useState(false);
  const [isGeneratingEndFrame, setIsGeneratingEndFrame] = useState(false);

  // Drag-and-drop state
  const [assignedStartFrame, setAssignedStartFrame] = useState<string | null>(null);
  const [assignedEndFrame, setAssignedEndFrame] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Frame-based video generation state
  const [frameVideoPrompt, setFrameVideoPrompt] = useState('');
  const [frameNegativePrompt, setFrameNegativePrompt] = useState('');
  const [frameDuration, setFrameDuration] = useState('8');
  const [frameAspectRatio, setFrameAspectRatio] = useState('16:9');
  const [frameModel, setFrameModel] = useState('veo-3.1-generate-preview');
  const [isGeneratingFrameVideo, setIsGeneratingFrameVideo] = useState(false);
  const [frameVideoProgress, setFrameVideoProgress] = useState(0);
  const [frameVideoId, setFrameVideoId] = useState<string | null>(null);
  const [frameVideoUrl, setFrameVideoUrl] = useState<string | null>(null);
  const frameResultRef = useRef<HTMLDivElement | null>(null);

  // Storage state
  const [savedStartFrameId, setSavedStartFrameId] = useState<string | null>(null);
  const [savedEndFrameId, setSavedEndFrameId] = useState<string | null>(null);
  const [isSavingFrame, setIsSavingFrame] = useState(false);
  const [isUploadingStartFrame, setIsUploadingStartFrame] = useState(false);
  const [isUploadingEndFrame, setIsUploadingEndFrame] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Whisk Composer state (lifted from component for persistence)
  const [whiskSubjectImage, setWhiskSubjectImage] = useState<{ url: string | null; prompt: string; isGenerating: boolean }>({ url: null, prompt: '', isGenerating: false });
  const [whiskSceneImage, setWhiskSceneImage] = useState<{ url: string | null; prompt: string; isGenerating: boolean }>({ url: null, prompt: '', isGenerating: false });
  const [whiskStyleImage, setWhiskStyleImage] = useState<{ url: string | null; prompt: string; isGenerating: boolean }>({ url: null, prompt: '', isGenerating: false });
  const [whiskCompositeImages, setWhiskCompositeImages] = useState<Array<{ url: string; savedId: string | null; isSaving: boolean }>>([]);
  const [isWhiskComposing, setIsWhiskComposing] = useState(false);
  const [whiskCompositionPrompt, setWhiskCompositionPrompt] = useState('Create a cohesive frame by blending the subject, scene, and style images naturally into a single unified image suitable for video generation.');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      sonnerToast.error('Image size must be less than 10MB');
      return;
    }

    if (!file.type.match(/^image\/(jpeg|png|jpg)$/)) {
      sonnerToast.error('Only JPEG and PNG images are supported');
      return;
    }

    setIsUploadingImage(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        sonnerToast.error('You must be logged in to upload files');
        setIsUploadingImage(false);
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/video-references/${fileName}`;

      const { data, error } = await supabase.storage
        .from('user-uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(filePath);

      setImage(publicUrl);
      sonnerToast.success('Reference image uploaded successfully!');
    } catch (error: any) {
      console.error('Failed to upload image:', error);
      sonnerToast.error(error?.message || 'Failed to upload image. Please try again.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const cancelVideoGeneration = async (id: string | null, type: 'text' | 'frame' = 'text') => {
    if (!id) return;
    
    try {
      const { error } = await supabase
        .from('videos')
        .update({ status: 'cancelled', error_message: 'Cancelled by user' })
        .eq('id', id);
      
      if (error) throw error;
      
      if (type === 'text') {
        setIsGenerating(false);
        setVideoId(null);
      } else {
        setIsGeneratingFrameVideo(false);
        setFrameVideoId(null);
      }
      
      sonnerToast.success('Video generation cancelled');
    } catch (error: any) {
      console.error('Failed to cancel:', error);
      sonnerToast.error('Failed to cancel generation');
    }
  };

  const pollVideoStatus = (id: string, videoTitle: string) => {
    let pollAttempts = 0;
    const maxAttempts = 60;
    
    const pollInterval = setInterval(async () => {
      pollAttempts++;
      
      if (pollAttempts > maxAttempts) {
        clearInterval(pollInterval);
        setIsGenerating(false);
        
        await supabase
          .from('videos')
          .update({ status: 'failed', error_message: 'Generation timeout (5 min limit)' })
          .eq('id', id);
        
        toast({
          title: 'Generation Timeout',
          description: 'Video generation exceeded 5 minute limit. Please try again.',
          variant: 'destructive'
        });
        return;
      }

      try {
        const { data, error } = await supabase
          .from('videos')
          .select('status, progress, video_url, error_message')
          .eq('id', id)
          .maybeSingle();

        if (error || !data) return;

        setProgress(data.progress || 0);

        if (data.status === 'cancelled') {
          clearInterval(pollInterval);
          setIsGenerating(false);
          setVideoId(null);
          return;
        }

        if (data.status === 'completed' && data.video_url) {
          clearInterval(pollInterval);
          setVideoUrl(data.video_url);
          setIsGenerating(false);
          
          toast({
            title: 'Success!',
            description: 'Your video has been generated.',
          });
        } else if (data.status === 'failed') {
          clearInterval(pollInterval);
          setIsGenerating(false);
          toast({
            title: 'Error',
            description: data.error_message || 'Video generation failed',
            variant: 'destructive',
          });
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  };

  const pollCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (pollCleanupRef.current) {
        pollCleanupRef.current();
      }
    };
  }, []);

  const repairStuckVideos = async () => {
    try {
      toast({
        title: 'Checking for stuck videos...',
        description: 'This may take a moment.',
      });

      const { data, error } = await supabase.functions.invoke('repair-videos');

      if (error) {
        console.error('Repair error:', error);
        toast({
          title: 'Repair Failed',
          description: 'An error occurred. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      if (data) {
        if (data.code === 'NO_STUCK_VIDEOS') {
          toast({
            title: 'All Good!',
            description: 'No stuck videos found.',
          });
        } else if (data.repaired > 0) {
          toast({
            title: 'Videos Repaired!',
            description: `Successfully repaired ${data.repaired} video(s).`,
          });
          setTimeout(() => window.location.reload(), 1500);
        }
      }
    } catch (error: any) {
      console.error('Repair error:', error);
      toast({
        title: 'Repair Failed',
        description: 'Could not complete the repair process.',
        variant: 'destructive',
      });
    }
  };

  const generateFrameVideo = async () => {
    if (!assignedStartFrame) {
      toast({
        title: 'Missing Start Frame',
        description: 'Please assign a start frame before generating video',
        variant: 'destructive',
      });
      return;
    }

    if (!frameVideoPrompt.trim()) {
      toast({
        title: 'Missing Prompt',
        description: 'Please enter a video description prompt',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingFrameVideo(true);
    setFrameVideoProgress(0);

    try {
      const { data, error } = await supabase.functions.invoke('generate-video-from-frames', {
        body: {
          startFrameUrl: assignedStartFrame,
          endFrameUrl: assignedEndFrame || undefined,
          prompt: frameVideoPrompt,
          aspectRatio: frameAspectRatio,
          duration: parseInt(frameDuration),
          mode: 'frame_to_video',
          model: frameModel
        }
      });

      if (error) throw error;

      const videoId = data.videoId;
      setFrameVideoId(videoId);
      
      let pollAttempts = 0;
      const maxAttempts = 240;
      
      const pollInterval = setInterval(async () => {
        pollAttempts++;
        
        if (pollAttempts > maxAttempts) {
          clearInterval(pollInterval);
          setIsGeneratingFrameVideo(false);
          toast({
            title: 'Still Generating',
            description: 'Video is taking longer than expected.',
          });
          return;
        }

        try {
          const { data: videoData, error: fetchError } = await supabase
            .from('videos')
            .select('status, progress, video_url, error_message')
            .eq('id', videoId)
            .single();

          if (fetchError) return;

          if (videoData) {
            setFrameVideoProgress(videoData.progress || 0);

            if (videoData.status === 'completed' && videoData.video_url) {
              clearInterval(pollInterval);
              setIsGeneratingFrameVideo(false);
              setFrameVideoUrl(videoData.video_url);
              setTimeout(() => frameResultRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
              toast({
                title: 'Video Ready!',
                description: 'Your frame-based video has been generated successfully.',
              });
            } else if (videoData.status === 'failed') {
              clearInterval(pollInterval);
              setIsGeneratingFrameVideo(false);
              toast({
                title: 'Generation Failed',
                description: videoData.error_message || 'Video generation failed.',
                variant: 'destructive',
              });
            }
          }
        } catch (innerError) {
          console.error('Error in poll loop:', innerError);
        }
      }, 5000);

      toast({
        title: 'Video Generation Started',
        description: 'This may take 2-5 minutes.',
      });
    } catch (error: any) {
      console.error('Error generating frame-based video:', error);
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to start video generation',
        variant: 'destructive',
      });
      setIsGeneratingFrameVideo(false);
    }
  };

  const generateVideo = async () => {
    if (!prompt.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a prompt',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setVideoUrl(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: {
          prompt,
          negativePrompt,
          duration: parseInt(duration),
          aspectRatio,
          model,
          image: image || undefined,
        },
      });

      if (error) throw error;

      if (data.success) {
        setVideoId(data.videoId);
        toast({
          title: 'Generation Started',
          description: data.message,
        });
        pollCleanupRef.current = pollVideoStatus(data.videoId, prompt.substring(0, 100));
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error: any) {
      console.error('Error:', error);
      setIsGenerating(false);
      toast({
        title: 'Error',
        description: error.message || 'Failed to start video generation',
        variant: 'destructive',
      });
    }
  };

  const handleFrameUpload = async (file: File, frameType: 'start' | 'end') => {
    const setUploading = frameType === 'start' ? setIsUploadingStartFrame : setIsUploadingEndFrame;
    
    try {
      setUploading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/video_frames/${frameType}_frame_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(fileName);
      
      if (frameType === 'start') {
        setAssignedStartFrame(publicUrl);
        sonnerToast.success('Start frame uploaded!');
      } else {
        setAssignedEndFrame(publicUrl);
        sonnerToast.success('End frame uploaded!');
      }
    } catch (error: any) {
      console.error('Error uploading frame:', error);
      sonnerToast.error(`Failed to upload ${frameType} frame`);
    } finally {
      setUploading(false);
    }
  };

  const handleDragStart = () => setIsDragging(true);
  const handleDragEnd = () => setIsDragging(false);

  const handleFrameAssigned = (zoneType: 'start' | 'end', imageUrl: string) => {
    if (zoneType === 'start') {
      setAssignedStartFrame(imageUrl);
      sonnerToast.success('Start frame assigned!');
    } else {
      setAssignedEndFrame(imageUrl);
      sonnerToast.success('End frame assigned!');
    }
  };

  const handleFrameRemoved = (zoneType: 'start' | 'end') => {
    if (zoneType === 'start') {
      setAssignedStartFrame(null);
      sonnerToast.info('Start frame removed');
    } else {
      setAssignedEndFrame(null);
      sonnerToast.info('End frame removed');
    }
  };

  const handleGenerateFrame = async (type: 'start' | 'end') => {
    const prompt = type === 'start' ? startFramePrompt : endFramePrompt;
    if (!prompt) {
      toast({
        title: 'Missing Prompt',
        description: `Please enter a ${type} frame prompt`,
        variant: 'destructive',
      });
      return;
    }

    if (type === 'start') {
      setIsGeneratingStartFrame(true);
    } else {
      setIsGeneratingEndFrame(true);
    }

    try {
      const { data, error } = await supabase.functions.invoke('generate-frame-image', {
        body: { prompt, frameType: type }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        if (type === 'start') {
          setGeneratedStartFrame(data.imageUrl);
        } else {
          setGeneratedEndFrame(data.imageUrl);
        }
        sonnerToast.success(`${type === 'start' ? 'Start' : 'End'} frame generated!`);
      }
    } catch (error: any) {
      console.error('Frame generation error:', error);
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate frame',
        variant: 'destructive',
      });
    } finally {
      if (type === 'start') {
        setIsGeneratingStartFrame(false);
      } else {
        setIsGeneratingEndFrame(false);
      }
    }
  };

  const handleGenerateBothFrames = async () => {
    if (!startFramePrompt) {
      toast({
        title: 'Missing Prompt',
        description: 'Please enter a start frame prompt',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingFrames(true);

    try {
      // Generate start frame
      const startResult = await supabase.functions.invoke('generate-frame-image', {
        body: { prompt: startFramePrompt, frameType: 'start' }
      });

      if (startResult.error) throw startResult.error;
      if (startResult.data?.imageUrl) {
        setGeneratedStartFrame(startResult.data.imageUrl);
      }

      // Generate end frame if prompt exists
      if (endFramePrompt) {
        const endResult = await supabase.functions.invoke('generate-frame-image', {
          body: { prompt: endFramePrompt, frameType: 'end' }
        });

        if (endResult.error) throw endResult.error;
        if (endResult.data?.imageUrl) {
          setGeneratedEndFrame(endResult.data.imageUrl);
        }
      }

      sonnerToast.success('Frames generated successfully!');
    } catch (error: any) {
      console.error('Frame generation error:', error);
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate frames',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingFrames(false);
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 flex items-center gap-2">
          <Video className="w-8 h-8 sm:w-10 sm:h-10" />
          AI Video Generator
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Generate stunning videos using Google Veo on Vertex AI
        </p>
      </div>

      <Tabs defaultValue="text-to-video" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-6">
          <TabsTrigger value="text-to-video">Text to Video</TabsTrigger>
          <TabsTrigger value="frame-to-video">Frame-Based</TabsTrigger>
          <TabsTrigger value="whisk-composer">Whisk Composer</TabsTrigger>
        </TabsList>

        <TabsContent value="text-to-video">
          <div className="flex flex-col gap-4 sm:gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Generation Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="prompt">Prompt *</Label>
                  <Textarea
                    id="prompt"
                    placeholder="Describe the video you want to generate..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="negativePrompt">Negative Prompt (Optional)</Label>
                  <Textarea
                    id="negativePrompt"
                    placeholder="What to avoid..."
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    rows={2}
                    className="mt-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="duration">Duration</Label>
                    <Select value={duration} onValueChange={setDuration}>
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
                    <Label htmlFor="aspectRatio">Aspect Ratio</Label>
                    <Select value={aspectRatio} onValueChange={setAspectRatio}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                        <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="model">Model</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="veo-3.1-generate-preview">Veo 3.1 (Best Quality)</SelectItem>
                      <SelectItem value="veo-3.1-fast-generate-preview">Veo 3.1 Fast</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="image">Reference Image (Optional)</Label>
                  <Input
                    id="image"
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    onChange={handleImageUpload}
                    disabled={isUploadingImage}
                    className="mt-2"
                  />
                  {isUploadingImage && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Uploading...</span>
                    </div>
                  )}
                  {image && !isUploadingImage && (
                    <div className="relative mt-2">
                      <img src={image} alt="Reference" className="w-full rounded-lg" />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setImage(null)}
                        className="absolute top-2 right-2"
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>

                <Button
                  onClick={generateVideo}
                  disabled={isGenerating}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? 'Generating...' : 'Generate Video'}
                </Button>

                <Button
                  variant="outline"
                  onClick={repairStuckVideos}
                  disabled={isGenerating}
                  className="w-full"
                >
                  Repair Stuck Videos
                </Button>

                {isGenerating && (
                  <div className="space-y-3">
                    <Progress value={progress} />
                    <p className="text-sm text-center text-muted-foreground">
                      {progress}% - This can take up to 5 minutes.
                    </p>
                    <Button
                      variant="destructive"
                      onClick={() => cancelVideoGeneration(videoId, 'text')}
                      className="w-full"
                      size="sm"
                    >
                      Stop Generation
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Generated Video</CardTitle>
              </CardHeader>
              <CardContent>
                {videoUrl ? (
                  <div className="space-y-4">
                    <div className="rounded-lg overflow-hidden bg-black">
                      <video
                        src={videoUrl}
                        controls
                        className="w-full"
                      />
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={async () => {
                        try {
                          const response = await fetch(videoUrl);
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `sineva-video-${Date.now()}.mp4`;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                          sonnerToast.success('Video download started!');
                        } catch (error) {
                          console.error('Download error:', error);
                          sonnerToast.error('Failed to download video');
                        }
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Video
                    </Button>
                  </div>
                ) : (
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Video className="w-16 h-16 mx-auto mb-4 opacity-20" />
                      <p>Your generated video will appear here</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="frame-to-video">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
            {/* Generate Frames Section */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  <CardTitle>Generate Frames</CardTitle>
                </div>
                <CardDescription>Create start and end frames using AI</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="start-frame-prompt">
                    Start Frame Prompt <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="start-frame-prompt"
                    placeholder="Describe the first frame (e.g., 'A peaceful forest at dawn with morning mist')"
                    className="min-h-[100px] resize-none"
                    value={startFramePrompt}
                    onChange={(e) => setStartFramePrompt(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-frame-prompt">
                    End Frame Prompt <span className="text-muted-foreground">(Optional)</span>
                  </Label>
                  <Textarea
                    id="end-frame-prompt"
                    placeholder="Describe the final frame (e.g., 'Same forest at sunset with golden light')"
                    className="min-h-[100px] resize-none"
                    value={endFramePrompt}
                    onChange={(e) => setEndFramePrompt(e.target.value)}
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleGenerateFrame('start')}
                    disabled={!startFramePrompt || isGeneratingStartFrame || isGeneratingFrames}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {isGeneratingStartFrame ? 'Generating...' : 'Generate Start'}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleGenerateFrame('end')}
                    disabled={!endFramePrompt || isGeneratingEndFrame || isGeneratingFrames}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {isGeneratingEndFrame ? 'Generating...' : 'Generate End'}
                  </Button>
                  <Button
                    className="w-full"
                    onClick={handleGenerateBothFrames}
                    disabled={!startFramePrompt || isGeneratingFrames || isGeneratingStartFrame || isGeneratingEndFrame}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {isGeneratingFrames ? 'Generating...' : 'Generate Both Frames'}
                  </Button>
                </div>

                {/* Generated Frames Preview */}
                {(generatedStartFrame || generatedEndFrame) && (
                  <div className="space-y-2 pt-4 border-t">
                    <Label className="text-sm font-medium">Generated Frames</Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Click to preview, drag to assign zones below
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {generatedStartFrame && (
                        <div 
                          className="relative group cursor-pointer" 
                          onClick={() => setPreviewImage(generatedStartFrame)}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('imageUrl', generatedStartFrame);
                            e.dataTransfer.setData('frameType', 'start');
                          }}
                        >
                          <img
                            src={generatedStartFrame}
                            alt="Generated Start Frame"
                            className="w-full h-40 object-cover rounded-lg border-2 border-border hover:border-primary transition-colors"
                            draggable={false}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                            <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs">
                              <GripVertical className="w-3 h-3" />
                              <span>Drag to assign</span>
                            </div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background/90 px-2 py-1 rounded text-xs">
                              Click to preview
                            </div>
                          </div>
                        </div>
                      )}
                      {generatedEndFrame && (
                        <div 
                          className="relative group cursor-pointer" 
                          onClick={() => setPreviewImage(generatedEndFrame)}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('imageUrl', generatedEndFrame);
                            e.dataTransfer.setData('frameType', 'end');
                          }}
                        >
                          <img
                            src={generatedEndFrame}
                            alt="Generated End Frame"
                            className="w-full h-40 object-cover rounded-lg border-2 border-border hover:border-primary transition-colors"
                            draggable={false}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                            <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs">
                              <GripVertical className="w-3 h-3" />
                              <span>Drag to assign</span>
                            </div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background/90 px-2 py-1 rounded text-xs">
                              Click to preview
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Assign Frames and Generate Video Section */}
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle>Assign Frames</CardTitle>
                  <CardDescription>Drag generated frames to Start/End zones</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Start Frame Zone</Label>
                      <FrameDropZone
                        zoneType="start"
                        assignedFrame={assignedStartFrame}
                        onFrameAssigned={(url) => handleFrameAssigned('start', url)}
                        onFrameRemoved={() => handleFrameRemoved('start')}
                        onFileUpload={(file) => handleFrameUpload(file, 'start')}
                        isActive={true}
                        isUploading={isUploadingStartFrame}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">End Frame Zone (Optional)</Label>
                      <FrameDropZone
                        zoneType="end"
                        assignedFrame={assignedEndFrame}
                        onFrameAssigned={(url) => handleFrameAssigned('end', url)}
                        onFrameRemoved={() => handleFrameRemoved('end')}
                        onFileUpload={(file) => handleFrameUpload(file, 'end')}
                        isActive={true}
                        isUploading={isUploadingEndFrame}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle>Generate Video</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="frameVideoPrompt">Video Description *</Label>
                    <Textarea
                      id="frameVideoPrompt"
                      placeholder="Describe the motion between frames..."
                      value={frameVideoPrompt}
                      onChange={(e) => setFrameVideoPrompt(e.target.value)}
                      rows={3}
                      className="mt-2"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Duration</Label>
                      <Select value={frameDuration} onValueChange={setFrameDuration}>
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
                      <Select value={frameAspectRatio} onValueChange={setFrameAspectRatio}>
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="16:9">16:9</SelectItem>
                          <SelectItem value="9:16">9:16</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    onClick={generateFrameVideo}
                    disabled={isGeneratingFrameVideo || !assignedStartFrame}
                    className="w-full"
                    size="lg"
                  >
                    {isGeneratingFrameVideo ? 'Generating...' : 'Generate Video'}
                  </Button>

                  {isGeneratingFrameVideo && (
                    <div className="space-y-3">
                      <Progress value={frameVideoProgress} />
                      <p className="text-sm text-center text-muted-foreground">
                        {frameVideoProgress}% - This may take 2-5 minutes
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Generated Video Result */}
            {frameVideoUrl && (
              <div ref={frameResultRef} className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Generated Video</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg overflow-hidden bg-black">
                      <video src={frameVideoUrl} controls className="w-full" />
                    </div>
                    <Button
                      onClick={async () => {
                        try {
                          const response = await fetch(frameVideoUrl);
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `sineva-video-${Date.now()}.mp4`;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                          sonnerToast.success('Video download started!');
                        } catch (error) {
                          console.error('Download error:', error);
                          sonnerToast.error('Failed to download video');
                        }
                      }}
                      variant="outline"
                      className="w-full mt-4"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Video
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="whisk-composer">
          <WhiskFrameComposer
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            aspectRatio={frameAspectRatio}
            subjectImage={whiskSubjectImage}
            sceneImage={whiskSceneImage}
            styleImage={whiskStyleImage}
            compositeImages={whiskCompositeImages}
            isComposing={isWhiskComposing}
            compositionPrompt={whiskCompositionPrompt}
            onSubjectImageChange={setWhiskSubjectImage}
            onSceneImageChange={setWhiskSceneImage}
            onStyleImageChange={setWhiskStyleImage}
            onCompositeImagesChange={setWhiskCompositeImages}
            onIsComposingChange={setIsWhiskComposing}
            onCompositionPromptChange={setWhiskCompositionPrompt}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 max-w-4xl mx-auto">
            <Card className="overflow-hidden flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Start Frame Zone</CardTitle>
                <CardDescription className="text-sm">Drag or upload</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 flex-1">
                <FrameDropZone
                  zoneType="start"
                  assignedFrame={assignedStartFrame}
                  onFrameAssigned={(url) => handleFrameAssigned('start', url)}
                  onFrameRemoved={() => handleFrameRemoved('start')}
                  onFileUpload={(file) => handleFrameUpload(file, 'start')}
                  isActive={true}
                  isUploading={isUploadingStartFrame}
                />
              </CardContent>
            </Card>

            <Card className="overflow-hidden flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">End Frame Zone (Optional)</CardTitle>
                <CardDescription className="text-sm">Drag or upload</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 flex-1">
                <FrameDropZone
                  zoneType="end"
                  assignedFrame={assignedEndFrame}
                  onFrameAssigned={(url) => handleFrameAssigned('end', url)}
                  onFrameRemoved={() => handleFrameRemoved('end')}
                  onFileUpload={(file) => handleFrameUpload(file, 'end')}
                  isActive={true}
                  isUploading={isUploadingEndFrame}
                />
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Generate Video from Frames</CardTitle>
              <CardDescription>Assign a start frame to begin video generation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="frameVideoPrompt">Video Description *</Label>
                <Textarea
                  id="frameVideoPrompt"
                  placeholder="Describe what happens in your video..."
                  value={frameVideoPrompt}
                  onChange={(e) => setFrameVideoPrompt(e.target.value)}
                  rows={3}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Negative Prompt (Optional)</Label>
                <Textarea
                  placeholder="What to avoid in the video..."
                  value={frameNegativePrompt}
                  onChange={(e) => setFrameNegativePrompt(e.target.value)}
                  rows={2}
                  className="mt-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Duration</Label>
                  <Select value={frameDuration} onValueChange={setFrameDuration}>
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
                  <Select value={frameAspectRatio} onValueChange={setFrameAspectRatio}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                      <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Model</Label>
                <Select value={frameModel} onValueChange={setFrameModel}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="veo-3.1-generate-preview">Veo 3.1 (Best Quality)</SelectItem>
                    <SelectItem value="veo-3.1-fast-generate-001">Veo 3.1 Fast</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={generateFrameVideo}
                disabled={isGeneratingFrameVideo || !assignedStartFrame}
                className="w-full"
                size="lg"
              >
                <Video className="mr-2 h-5 w-5" />
                {isGeneratingFrameVideo ? 'Generating...' : 'Generate Video'}
              </Button>

              {isGeneratingFrameVideo && (
                <div className="space-y-3">
                  <Progress value={frameVideoProgress} />
                  <p className="text-sm text-center text-muted-foreground">
                    {frameVideoProgress}%
                  </p>
                </div>
              )}

              <Button
                onClick={repairStuckVideos}
                variant="outline"
                className="w-full"
              >
                Repair Stuck Videos
              </Button>
            </CardContent>
          </Card>

          {frameVideoUrl && (
            <div ref={frameResultRef} className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Generated Video</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg overflow-hidden bg-black">
                    <video src={frameVideoUrl} controls className="w-full" />
                  </div>
                  <Button
                    onClick={async () => {
                      try {
                        const response = await fetch(frameVideoUrl);
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `sineva-video-${Date.now()}.mp4`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                        sonnerToast.success('Video download started!');
                      } catch (error) {
                        console.error('Download error:', error);
                        sonnerToast.error('Failed to download video');
                      }
                    }}
                    variant="outline"
                    className="w-full mt-4"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Video
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-2xl" aria-describedby="preview-description">
          <DialogTitle className="sr-only">Frame Preview</DialogTitle>
          <DialogDescription id="preview-description" className="sr-only">
            Full size preview of the generated frame
          </DialogDescription>
          {previewImage && (
            <img src={previewImage} alt="Frame preview" className="w-full h-auto rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}