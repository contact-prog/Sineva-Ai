import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { StoryFormData } from './StoryCustomizeStep';
import { ScenePlanningReview } from './ScenePlanningReview';
import { ImageGenerationReview } from './ImageGenerationReview';
import { StoryboardReview } from './StoryboardReview';
import { VideoClipReview } from './VideoClipReview';
import { AudioReview } from './AudioReview';
import { FinalAssemblyStatus } from './FinalAssemblyStatus';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

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

export function StoryGenerateStep({ formData, onBack, onComplete, previewMode = true }: StoryGenerateStepProps) {
  const { toast } = useToast();
  const [phase, setPhase] = useState<WorkflowPhase>('planning_scenes');
  const [videoGenerationId, setVideoGenerationId] = useState<string | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [progress, setProgress] = useState(0);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [veoModel, setVeoModel] = useState('veo-3.1-generate-001');
  const [voiceoverUrl, setVoiceoverUrl] = useState<string>();
  const [musicUrl, setMusicUrl] = useState<string>();
  const [platformVideos, setPlatformVideos] = useState<any[]>([]);

  // Phase 1: Plan Scenes
  useEffect(() => {
    if (phase === 'planning_scenes') {
      planScenes();
    }
  }, [phase]);

  const planScenes = async () => {
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

      setVideoGenerationId(data.videoGenerationId);
      setScenes(data.scenes);
      setProgress(100);
      setPhase('review_scenes');
    } catch (error: any) {
      toast({
        title: 'Scene Planning Failed',
        description: error.message,
        variant: 'destructive',
      });
      onBack();
    }
  };

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

      setScenes(data.scenes);
      setProgress(100);
      
      // If preview mode, stop here and show storyboard review
      if (previewMode) {
        setPhase('review_storyboard');
      } else {
        // Full video mode: continue automatically
        handleApproveImagesAndGenerateVideos();
      }
    } catch (error: any) {
      toast({
        title: 'Image Generation Failed',
        description: error.message,
        variant: 'destructive',
      });
      setPhase('review_scenes');
    }
  };

  const handleApproveImagesAndGenerateVideos = async () => {
    // Calculate estimates
    const cost = scenes.length * 0.48; // Approximate cost per clip
    const time = Math.ceil(scenes.length * 2.5); // Approximate time
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

      setScenes(data.scenes);
      setProgress(100);
      
      // If audio is requested, move to audio generation, otherwise go to assembly
      if (formData.includeVoiceover || formData.includeMusic) {
        handleGenerateAudio();
      } else {
        handleAssembleVideos();
      }
    } catch (error: any) {
      toast({
        title: 'Video Generation Failed',
        description: error.message,
        variant: 'destructive',
      });
      setPhase('review_storyboard');
    }
  };

  const handleGenerateAudio = async () => {
    setPhase('generating_audio');
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

      setVoiceoverUrl(data.voiceoverUrl);
      setMusicUrl(data.musicUrl);
      setProgress(100);
      handleAssembleVideos();
    } catch (error: any) {
      toast({
        title: 'Audio Generation Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleAssembleVideos = async () => {
    setPhase('assembling');
    setProgress(0);

    try {
      const { data, error } = await supabase.functions.invoke('assemble-final-videos', {
        body: {
          videoGenerationId,
          platforms: formData.platforms,
          includeVoiceover: formData.includeVoiceover,
          includeMusic: formData.includeMusic,
          includeLogo: formData.includeLogo,
        },
      });

      if (error) throw error;

      setPlatformVideos(data.videos);
      setProgress(100);
      setPhase('completed');

      toast({
        title: 'Videos Generated Successfully!',
        description: `${data.videos.length} platform-optimized videos are ready.`,
      });
    } catch (error: any) {
      toast({
        title: 'Assembly Failed',
        description: error.message,
        variant: 'destructive',
      });
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
            onGenerateFullStory={handleApproveImagesAndGenerateVideos}
            estimatedCost={scenes.length * 0.48}
            estimatedTime={Math.ceil(scenes.length * 2.5)}
          />
        );

      case 'generating_videos':
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
        return <FinalAssemblyStatus isAssembling={true} onComplete={onComplete} />;

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
