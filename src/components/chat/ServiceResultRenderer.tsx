import { Suspense, lazy } from 'react';
import { ServiceWorkflow } from '@/contexts/ChatContext';
import { Card } from '@/components/ui/card';
import { Loader2, AlertCircle, XCircle } from 'lucide-react';

// Lazy load service components
const PlatformSelector = lazy(() => import('@/components/services/graphics/PlatformSelector'));
const AdvancedOptionsForm = lazy(() => import('@/components/services/graphics/AdvancedOptionsForm'));
const GraphicPreviewCard = lazy(() => import('@/components/services/graphics/GraphicPreviewCard'));
const GraphicEditCard = lazy(() => import('@/components/services/graphics/GraphicEditCard'));
const GraphicBatchCard = lazy(() => import('@/components/services/graphics/GraphicBatchCard'));

// Video components - Text to Video only
const VideoPlatformSelector = lazy(() => import('@/components/chat/video/VideoPlatformSelector'));
const VideoGenerationProgress = lazy(() => import('@/components/chat/video/VideoGenerationProgress'));
const VideoPreviewCard = lazy(() => import('@/components/chat/video/VideoPreviewCard'));

// Blog components
const BlogSetupForm = lazy(() => import('@/components/chat/blog/BlogSetupForm'));
const BlogPreviewCard = lazy(() => import('@/components/chat/blog/BlogPreviewCard'));

interface ServiceResultRendererProps {
  workflow: ServiceWorkflow | null;
}

function LoadingFallback() {
  return (
    <Card className="p-6 flex items-center justify-center bg-card/50">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </Card>
  );
}

export default function ServiceResultRenderer({ workflow }: ServiceResultRendererProps) {
  // Don't render if no workflow
  if (!workflow) {
    return null;
  }
  
  // Don't render complete stage for graphics (it handles its own display)
  if (workflow.stage === 'complete' && workflow.service === 'graphics') {
    return null;
  }

  // ========== GRAPHICS SERVICE ==========
  if (workflow.service === 'graphics') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        {workflow.stage === 'setup' && workflow.config?.step === 'platforms' && (
          <PlatformSelector />
        )}
        
        {workflow.stage === 'setup' && workflow.config?.step === 'options' && (
          <AdvancedOptionsForm />
        )}
        
        {workflow.stage === 'preview' && workflow.preview && (
          <GraphicPreviewCard 
            preview={workflow.preview} 
            config={workflow.config}
          />
        )}
        
        {workflow.stage === 'editing' && workflow.preview && (
          <GraphicEditCard preview={workflow.preview} />
        )}
        
        {workflow.stage === 'batch' && workflow.results && workflow.results.length > 0 && (
          <GraphicBatchCard results={workflow.results} />
        )}
      </Suspense>
    );
  }

  // ========== VIDEO SERVICE (Text to Video Only) ==========
  if (workflow.service === 'video') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        {/* Platform & Settings Selection */}
        {workflow.stage === 'setup' && (
          <VideoPlatformSelector />
        )}

        {/* Video Generation in Progress - Real Status */}
        {workflow.stage === 'generating' && workflow.config.videoId && (
          <VideoGenerationProgress 
            videoId={workflow.config.videoId}
            status={workflow.config.status}
          />
        )}

        {/* Completed Successfully */}
        {workflow.stage === 'complete' && workflow.config.status === 'completed' && workflow.results?.[0] && (
          <VideoPreviewCard
            videoId={workflow.results[0].id}
            videoUrl={workflow.results[0].video_url}
            thumbnailUrl={workflow.results[0].thumbnail_url}
            platforms={workflow.config?.platforms || []}
            duration={workflow.results[0].duration_seconds || 6}
            prompt={workflow.results[0].prompt}
            status="completed"
          />
        )}

        {/* Failed State */}
        {workflow.stage === 'complete' && workflow.config.status === 'failed' && (
          <Card className="p-6 space-y-4 bg-destructive/5 border-destructive/30">
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              <h4 className="font-semibold">Video Generation Failed</h4>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-lg">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-destructive font-medium mb-1">
                  {workflow.metadata?.errorType === 'authentication_error' && 'Authentication Error'}
                  {workflow.metadata?.errorType === 'timeout_error' && 'Generation Timeout'}
                  {workflow.metadata?.errorType === 'rate_limit_error' && 'Rate Limit Exceeded'}
                  {!workflow.metadata?.errorType && 'Generation Error'}
                </p>
                <p className="text-sm text-destructive/90">
                  {workflow.metadata?.error || 'An unexpected error occurred during video generation'}
                </p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              {workflow.metadata?.errorType === 'authentication_error' && (
                <p className="text-yellow-600 dark:text-yellow-400">
                  💡 This may be due to Vertex AI permissions. Contact support if the issue persists.
                </p>
              )}
              {workflow.metadata?.errorType === 'timeout_error' && (
                <p className="text-yellow-600 dark:text-yellow-400">
                  💡 Try a shorter duration or simpler prompt.
                </p>
              )}
              {workflow.metadata?.errorType === 'rate_limit_error' && (
                <p className="text-yellow-600 dark:text-yellow-400">
                  💡 Wait a moment and try again. VEO has rate limits.
                </p>
              )}
            </div>
          </Card>
        )}
      </Suspense>
    );
  }

  // ========== BLOG/CONTENT SERVICE ==========
  if (workflow.service === 'content') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        {/* Blog setup form */}
        {workflow.stage === 'setup' && (
          <BlogSetupForm />
        )}

        {/* Blog generation in progress */}
        {workflow.stage === 'generating' && (
          <Card className="p-6 space-y-4 bg-card/50">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div>
                <h4 className="font-semibold">Generating Blog Content</h4>
                <p className="text-sm text-muted-foreground">This may take a moment...</p>
              </div>
            </div>
          </Card>
        )}

        {/* Blog generated successfully */}
        {workflow.stage === 'complete' && workflow.metadata?.content && (
          <BlogPreviewCard
            content={workflow.metadata.content}
            topic={workflow.metadata.topic || 'Blog Post'}
            contentType={workflow.metadata.contentType || 'blog'}
            metaDescription={workflow.metadata.metaDescription}
            seoKeywords={workflow.metadata.seoKeywords}
            readabilityScore={workflow.metadata.readabilityScore}
          />
        )}

        {/* Blog generation failed */}
        {workflow.stage === 'complete' && workflow.metadata?.error && (
          <Card className="p-6 space-y-4 bg-destructive/5 border-destructive/30">
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              <h4 className="font-semibold">Blog Generation Failed</h4>
            </div>
            <p className="text-sm text-destructive">
              {workflow.metadata.error}
            </p>
          </Card>
        )}
      </Suspense>
    );
  }

  // Default fallback - unknown service
  return null;
}
