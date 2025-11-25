import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download, Play, Film, Clock, DollarSign, PlaySquare, Link as LinkIcon, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VideoGeneration {
  id: string;
  prompt: string;
  user_prompt?: string;
  style?: string;
  duration_seconds?: number;
  platforms?: string[];
  video_url?: string;
  thumbnail_url?: string;
  status: string;
  cost_usd?: number;
  generation_time_seconds?: number;
  veo_model_used?: string;
  intermediate_clips_urls?: string[];
  is_automated?: boolean;
  is_extension?: boolean;
  original_video_id?: string;
  extension_count?: number;
  extracted_info?: any;
  metadata?: any;
  created_at: string;
}

interface Scene {
  id: string;
  scene_number: number;
  visual_description: string;
  narration: string;
  mood: string;
  duration_seconds: number;
  image_url: string;
  video_clip_url: string;
}

const VideoResult = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const navigate = useNavigate();
  const { toast } = useToast();
  const [videoGen, setVideoGen] = useState<VideoGeneration | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [extensions, setExtensions] = useState<VideoGeneration[]>([]);
  const [originalVideo, setOriginalVideo] = useState<VideoGeneration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('primary');

  useEffect(() => {
    loadVideoData();
    
    // Set up realtime subscription for status updates
    if (!id) return;
    
    const channel = supabase
      .channel(`video-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'video_generations',
          filter: `id=eq.${id}`
        },
        (payload) => {
          console.log('Video status updated:', payload.new);
          setVideoGen(payload.new as VideoGeneration);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const loadVideoData = async () => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Load video generation data
      const { data: videoData, error: videoError } = await supabase
        .from('video_generations')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (videoError) throw videoError;
      
      if (!videoData) {
        console.log('No video data found for id:', id);
        setVideoGen(null);
        setIsLoading(false);
        return;
      }

      setVideoGen(videoData as VideoGeneration);

      // Load scenes (only if video has scenes)
      const { data: scenesData, error: scenesError } = await supabase
        .from('video_story_scenes')
        .select('*')
        .eq('video_generation_id', id)
        .order('scene_number', { ascending: true });

      if (scenesError && scenesError.code !== 'PGRST116') {
        console.error('Error loading scenes:', scenesError);
      }
      
      setScenes(scenesData || []);

      // Load extensions if this is not an extension itself
      if (!videoData.is_extension) {
        const { data: extensionsData } = await supabase
          .from('video_generations')
          .select('*')
          .eq('original_video_id', videoData.id)
          .order('created_at', { ascending: true });
        
        if (extensionsData) {
          setExtensions(extensionsData as VideoGeneration[]);
        }
      }

      // Load original video if this is an extension
      if (videoData.is_extension && videoData.original_video_id) {
        const { data: originalData } = await supabase
          .from('video_generations')
          .select('*')
          .eq('id', videoData.original_video_id)
          .single();
        
        if (originalData) {
          setOriginalVideo(originalData as VideoGeneration);
        }
      }

    } catch (error) {
      console.error('Error loading video:', error);
      toast({
        title: 'Error',
        description: 'Failed to load video data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExtendVideo = () => {
    if (videoGen) {
      navigate(`/videos?mode=extend&baseVideoId=${videoGen.id}`);
    }
  };

  const handleDownload = async (url: string, platform: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `video-${platform}-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: 'Download Started',
        description: `Downloading ${platform} video...`
      });
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: 'Could not download video',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-6xl py-8 space-y-6">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!videoGen) {
    return (
      <div className="container max-w-6xl py-8">
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-muted-foreground">Video not found</p>
            <p className="text-sm text-muted-foreground">
              This video may have been deleted or the link is incorrect
            </p>
            <Button onClick={() => navigate('/app/videos')} className="mt-4">
              Back to Videos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If video is still generating
  if (videoGen.status === 'generating') {
    return (
      <div className="container max-w-6xl py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/app/videos')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Video Generation In Progress</h1>
            <p className="text-muted-foreground mt-1">
              {videoGen.user_prompt || videoGen.prompt}
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
            </div>
            <div className="space-y-2">
              <p className="text-xl font-semibold">Generating Your Video...</p>
              <p className="text-muted-foreground">
                This usually takes 45-180 seconds. Your video is being created by VEO 3.1 AI.
              </p>
              <p className="text-sm text-muted-foreground mt-4">
                You can safely close this page. We'll save your video and you can come back later.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If video failed
  if (videoGen.status === 'failed') {
    return (
      <div className="container max-w-6xl py-8">
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-destructive font-semibold">Video Generation Failed</p>
            <p className="text-sm text-muted-foreground">
              There was an error generating your video. Please try again.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => navigate('/app/videos')} variant="outline">
                Back to Videos
              </Button>
              <Button onClick={() => navigate('/app/videos')}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/app/videos')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Generated Video</h1>
          <p className="text-muted-foreground mt-1">
            {videoGen.user_prompt || videoGen.prompt}
          </p>
        </div>
        {videoGen.is_automated && (
          <Badge variant="secondary" className="gap-1">
            <Film className="h-3 w-3" />
            AI Automated
          </Badge>
        )}
      </div>

      {/* Original Video Alert */}
      {originalVideo && (
        <Alert>
          <LinkIcon className="h-4 w-4" />
          <AlertDescription>
            This is an extension of{' '}
            <button
              onClick={() => navigate(`/app/video-result?id=${originalVideo.id}`)}
              className="underline font-medium hover:text-primary"
            >
              the original video
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* Video Player */}
      <Card>
        <CardContent className="p-6 space-y-4">
          {videoGen.video_url ? (
            <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
              <video
                src={videoGen.video_url}
                controls
                className="w-full h-full object-contain"
                poster={videoGen.thumbnail_url}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          ) : (
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground">No video available yet</p>
            </div>
          )}

          {/* Download & Extend Buttons */}
          <div className="flex gap-2">
            <Button onClick={() => handleDownload(videoGen.video_url!, 'primary')} className="flex-1">
              <Download className="mr-2 h-4 w-4" />
              Download Video
            </Button>
            {!videoGen.is_extension && videoGen.video_url && (
              <Button onClick={handleExtendVideo} variant="outline" className="flex-1">
                <PlaySquare className="mr-2 h-4 w-4" />
                Extend This Video
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Extensions List */}
      {extensions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Extensions ({extensions.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {extensions.map((ext) => (
              <div
                key={ext.id}
                className="flex items-center gap-4 p-4 border rounded-lg cursor-pointer hover:border-primary transition-colors"
                onClick={() => navigate(`/app/video-result?id=${ext.id}`)}
              >
                <video src={ext.video_url} className="w-32 h-20 rounded object-cover" />
                <div className="flex-1">
                  <p className="font-medium line-clamp-1">{ext.prompt}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">{ext.duration_seconds}s</Badge>
                    <Badge variant="outline">Extension</Badge>
                    {ext.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {ext.status === 'generating' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Video Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{videoGen.duration_seconds || 0}s</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Film className="h-4 w-4 text-muted-foreground" />
              Scenes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{scenes.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${(videoGen.cost_usd || 0).toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Scene Breakdown */}
      {scenes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Scene Breakdown</CardTitle>
            <CardDescription>
              {scenes.length} scenes {videoGen.style && `• ${videoGen.style} style`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {scenes.map((scene) => (
              <div key={scene.id} className="flex gap-4 p-4 border border-border rounded-lg">
                {scene.image_url && (
                  <img
                    src={scene.image_url}
                    alt={`Scene ${scene.scene_number}`}
                    className="w-32 h-24 object-cover rounded"
                  />
                )}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Scene {scene.scene_number}</Badge>
                    <Badge variant="secondary">{scene.duration_seconds}s</Badge>
                    {scene.mood && <Badge className="capitalize">{scene.mood}</Badge>}
                  </div>
                  <p className="text-sm font-medium">{scene.visual_description}</p>
                  {scene.narration && (
                    <p className="text-sm text-muted-foreground italic">
                      "{scene.narration}"
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Generation Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {videoGen.veo_model_used && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Model:</span>
              <span className="font-medium">{videoGen.veo_model_used}</span>
            </div>
          )}
          {videoGen.generation_time_seconds && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Generation Time:</span>
              <span className="font-medium">{videoGen.generation_time_seconds}s</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status:</span>
            <Badge className="capitalize">{videoGen.status}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoResult;
