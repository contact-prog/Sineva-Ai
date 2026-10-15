import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { StoryFormData } from './StoryCustomizeStep';
import { ScenePlanningReview } from './ScenePlanningReview';
import { StoryboardReview } from './StoryboardReview';
import { VideoClipReview } from './VideoClipReview';
import { FinalAssemblyStatus } from './FinalAssemblyStatus';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { assemblyRequest, completedVideos, type PlatformVideo } from './videoExport';

type WorkflowPhase = 
  | 'planning_scenes'
  | 'review_scenes'
  | 'generating_images'
  | 'review_storyboard'
  | 'generating_videos'
  | 'review_videos'
  | 'generating_audio'
  | 'assembling'
  | 'completed';

interface Scene {
  id: string;
  scene_number: number;
  visual_description: string;
  narration: string;
  mood: string;
  duration_seconds: number;
  image_url?: string;
  video_clip_url?: string;
}

interface StoryGenerateStepProps {
  formData: StoryFormData;
  onBack: () => void;
  onComplete: () => void;
  previewMode?: boolean;
}

const loadScenes = async (id: string) => {
    const { data, error } = await supabase.from('video_story_scenes').select('*')
      .eq('video_generation_id', id).order('scene_number');
    if (error) throw error;
    if (!data?.length) throw new Error('No scenes found');
    return data as Scene[];
  };


export function StoryGenerateStep({ formData, onBack, onComplete, previewMode = true }: StoryGenerateStepProps) {
  const { toast } = useToast();
  const [phase, setPhase] = useState<WorkflowPhase>('planning_scenes');
  const [videoGenerationId, setVideoGenerationId] = useState<string | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [progress, setProgress] = useState(0);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [veoModel, setVeoModel] = useState('veo-3.1-generate-001');
  const [platformVideos, setPlatformVideos] = useState<PlatformVideo[]>([]);

  const [assemblyJobId, setAssemblyJobId] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Poll a durable job. Cleanup prevents updates after the dialog closes.
  useEffect(() => {
    if (phase !== 'assembling' || !assemblyJobId || exportError) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('assemble-final-videos', {
          body: { action: 'status', videoGenerationId, jobId: assemblyJobId },
        });
        if (cancelled) return;
        if (error) throw error;
        const videos = completedVideos(data);
        if (videos) {
          setPlatformVideos(videos);
          setProgress(100);
          setPhase('completed');
          toast({ title: 'Videos Ready!', description: `${videos.length} videos are ready to download.` });
          return;
        }
        timer = setTimeout(poll, 3000);
      } catch (error) {
        if (!cancelled) setExportError(error instanceof Error ? error.message : 'Could not check export status');
      }
    };
    poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [phase, assemblyJobId, videoGenerationId, exportError, toast]);

  const waitForImages = async (id: string) => {
    const deadline = Date.now() + 10 * 60 * 1000;
    while (mounted.current && Date.now() < deadline) {
      const { data, error } = await supabase.from('video_generations').select('status').eq('id', id).single();
      if (error) throw error;
      if (data.status === 'failed') throw new Error('Scene image generation failed');
      if (data.status === 'images_generated') return await loadScenes(id);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    throw new Error('Image generation is still pending. Check your video library before retrying.');
  };

  const planScenes = useCallback(async () => {
    try {
      setProgress(10);
      const { data, error } = await supabase.functions.invoke('plan-video-scenes', {
        body: {
          storyInput: formData.storyInput,
          duration: formData.duration,
          style: formData.style,
          includeVoiceover: formData.includeVoiceover,
        },
      });

      if (error) throw error;

      const plannedScenes = await loadScenes(data.videoGenerationId);
      if (!mounted.current) return;
      setVideoGenerationId(data.videoGenerationId);
      setScenes(plannedScenes);
      setProgress(100);
      setPhase('review_scenes');
    } catch (error) {
      if (!mounted.current) return;
      toast({
        title: 'Scene Planning Failed',
        description: error instanceof Error ? error.message : 'Video generation failed',
        variant: 'destructive',
      });
      onBack();
    }
  }, [formData.storyInput, formData.duration, formData.style, formData.includeVoiceover, toast, onBack]);

  useEffect(() => {
    if (phase === 'planning_scenes') planScenes();
  }, [phase, planScenes]);


  const handleApproveScenesAndGenerateImages = async () => {
    setPhase('generating_images');
    setProgress(0);

    try {
      const { data, error } = await supabase.functions.invoke('generate-scene-images', {
        body: {
          videoGenerationId,
          style: formData.style,
        },
      });

      if (error) throw error;

      const generatedScenes = await waitForImages(videoGenerationId!);
      if (!mounted.current) return;
      setScenes(generatedScenes);
      setProgress(100);
      
      // If preview mode, stop here and show storyboard review
      if (previewMode) {
        setPhase('review_storyboard');
      } else {
        // Full video mode: continue automatically
        handleApproveImagesAndGenerateVideos(generatedScenes.length);
      }
    } catch (error) {
      if (!mounted.current) return;
      toast({
        title: 'Image Generation Failed',
        description: error instanceof Error ? error.message : 'Video generation failed',
        variant: 'destructive',
      });
      setPhase('review_scenes');
    }
  };

  const handleApproveImagesAndGenerateVideos = async (sceneCount = scenes.length) => {
    // Calculate estimates
    const cost = sceneCount * 0.48; // Approximate cost per clip
    const time = Math.ceil(sceneCount * 2.5); // Approximate time
    setEstimatedCost(cost);
    setEstimatedTime(time);
    setVeoModel(formData.videoQuality === 'standard' ? 'veo-3.1-fast-001' : 'veo-3.1-generate-001');
    setPhase('review_videos');
  };

  const handleConfirmCostAndGenerateVideos = async () => {
    setPhase('generating_videos');
    setProgress(0);

    try {
      const { data, error } = await supabase.functions.invoke('generate-video-clips', {
        body: {
          videoGenerationId,
          veoModel: formData.videoQuality === 'standard' ? 'veo-3.1-fast-001' : 'veo-3.1-generate-001',
        },
      });

      if (error) throw error;

      const generatedScenes = await loadScenes(videoGenerationId!);
      if (!mounted.current) return;
      setScenes(generatedScenes);
      setProgress(100);
      
      // If audio is requested, move to audio generation, otherwise go to assembly
      if (formData.includeVoiceover || formData.includeMusic) {
        handleGenerateAudio();
      } else {
        handleAssembleVideos();
      }
    } catch (error) {
      if (!mounted.current) return;
      toast({
        title: 'Video Generation Failed',
        description: error instanceof Error ? error.message : 'Video generation failed',
        variant: 'destructive',
      });
      setPhase('review_storyboard');
    }
  };

  const handleGenerateAudio = async () => {
    setPhase('generating_audio');
    setExportError(null);
    setProgress(0);

    try {
      const { data, error } = await supabase.functions.invoke('generate-video-audio', {
        body: {
          videoGenerationId,
          includeVoiceover: formData.includeVoiceover,
          includeMusic: formData.includeMusic,
          style: formData.style,
          duration: formData.duration,
        },
      });

      if (error) throw error;

      if (!mounted.current) return;
      setProgress(100);
      handleAssembleVideos();
    } catch (error) {
      if (!mounted.current) return;
      toast({
        title: 'Audio Generation Failed',
        description: error instanceof Error ? error.message : 'Video generation failed',
        variant: 'destructive',
      });
      setExportError(error instanceof Error ? error.message : 'Audio generation failed');
    }
  };

  const handleAssembleVideos = async () => {
    if (!videoGenerationId) return;
    setPhase('assembling');
    setExportError(null);
    setAssemblyJobId(null);
    setProgress(0);
    try {
      const { data, error } = await supabase.functions.invoke('assemble-final-videos', {
        body: assemblyRequest(videoGenerationId, {
          duration: formData.duration, style: formData.style, platforms: formData.platforms,
          includeVoiceover: formData.includeVoiceover, includeMusic: formData.includeMusic,
          includeLogo: formData.includeLogo,
        }),
      });
      if (error) throw error;
      if (!data?.jobId) throw new Error('Export did not return a job ID');
      if (mounted.current) setAssemblyJobId(data.jobId);
    } catch (error) {
      if (mounted.current) setExportError(error instanceof Error ? error.message : 'Assembly failed');
    }
  };

  const getPhaseLabel = () => {
    const labels: Record<WorkflowPhase, string> = {
      planning_scenes: 'Planning Scenes',
      review_scenes: 'Review Scenes',
      generating_images: 'Generating Images',
      review_storyboard: 'Review Storyboard',
      generating_videos: 'Generating Videos',
      review_videos: 'Cost Approval',
      generating_audio: 'Generating Audio',
      assembling: 'Assembling Videos',
      completed: 'Completed',
    };
    return labels[phase];
  };

  const renderPhaseContent = () => {
    switch (phase) {
      case 'planning_scenes':
        return (
          <div className="text-center py-12">
            <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4 text-primary" />
            <h3 className="text-lg font-semibold mb-2">Planning Your Story</h3>
            <p className="text-sm text-muted-foreground">
              AI is analyzing your input and creating a scene breakdown...
            </p>
            <Progress value={progress} className="mt-4 max-w-xs mx-auto" />
          </div>
        );

      case 'review_scenes':
        return (
          <ScenePlanningReview
            scenes={scenes}
            onApprove={handleApproveScenesAndGenerateImages}
            onRegenerate={planScenes}
          />
        );

      case 'generating_images':
        return (
          <div className="text-center py-12">
            <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4 text-primary" />
            <h3 className="text-lg font-semibold mb-2">Generating Images</h3>
            <p className="text-sm text-muted-foreground">
              Creating visual representations for each scene...
            </p>
            <Progress value={progress} className="mt-4 max-w-xs mx-auto" />
          </div>
        );

      case 'review_storyboard':
        return (
          <StoryboardReview
            scenes={scenes}
            onGenerateFullStory={() => handleApproveImagesAndGenerateVideos()}
            estimatedCost={scenes.length * 0.48}
            estimatedTime={Math.ceil(scenes.length * 2.5)}
          />
        );

      case 'review_videos':
        return (
          <VideoClipReview
            scenes={scenes.filter(s => s.image_url).map(s => ({
              scene_number: s.scene_number,
              video_clip_url: s.image_url!,
              visual_description: s.visual_description,
              duration_seconds: s.duration_seconds,
            }))}
            estimatedCost={estimatedCost}
            estimatedTime={estimatedTime}
            veoModel={veoModel}
            onApprove={handleConfirmCostAndGenerateVideos}
            onBack={() => setPhase('review_storyboard')}
          />
        );

      case 'generating_videos':
        return (
          <div className="text-center py-12">
            <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4 text-primary" />
            <h3 className="text-lg font-semibold mb-2">Generating Video Clips</h3>
            <p className="text-sm text-muted-foreground">
              Using VEO AI to create video clips from images...
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              This may take several minutes. You can close this dialog and check back later.
            </p>
            <Progress value={progress} className="mt-4 max-w-xs mx-auto" />
          </div>
        );

      case 'generating_audio':
        if (exportError) return (
          <div className="space-y-4" role="alert">
            <p>{exportError}</p>
            <Button onClick={handleGenerateAudio}>Retry Audio</Button>
          </div>
        );
        return (
          <div className="text-center py-12">
            <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4 text-primary" />
            <h3 className="text-lg font-semibold mb-2">Generating Audio</h3>
            <p className="text-sm text-muted-foreground">
              Creating voiceover and music tracks...
            </p>
            <Progress value={progress} className="mt-4 max-w-xs mx-auto" />
          </div>
        );

      case 'assembling':
        return exportError ? (
          <div className="space-y-4" role="alert">
            <p>{exportError}</p>
            <Button onClick={() => setExportError(null)} disabled={!assemblyJobId}>Check Status Again</Button>
            <Button variant="outline" onClick={handleAssembleVideos}>Retry Export</Button>
          </div>
        ) : <FinalAssemblyStatus isAssembling={true} onComplete={onComplete} />;

      case 'completed':
        return (
          <FinalAssemblyStatus
            isAssembling={false}
            videos={platformVideos}
            onComplete={onComplete}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Badge variant="secondary">{getPhaseLabel()}</Badge>
        {phase !== 'completed' && (
          <span className="text-sm text-muted-foreground">
            Step {['planning_scenes', 'review_scenes', 'generating_images', 'review_storyboard', 'review_videos', 'generating_videos', 'generating_audio', 'assembling'].indexOf(phase) + 1} of 8
          </span>
        )}
      </div>

      {renderPhaseContent()}
    </div>
  );
}
