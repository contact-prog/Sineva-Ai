import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';
import { generateVertexAuthToken, getVertexProjectId } from '../_shared/vertex-auth.ts';
import { planScenes } from '../_shared/video-scene-planner.ts';
import { generateSceneImages } from '../_shared/video-image-generator.ts';
import { generateVideoClips } from '../_shared/video-clip-generator.ts';
import { generateAudioLayers } from '../_shared/video-audio-generator.ts';
import { enqueueVideoAssembly } from '../_shared/video-assembler.ts';

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StoryRequest {
  storyInput: string;
  duration: number;
  style: 'narrative' | 'viral' | 'music' | 'product';
  platforms: string[];
  includeVoiceover: boolean;
  includeMusic: boolean;
  includeLogo: boolean;
  videoQuality?: 'standard' | 'fast';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('User authenticated:', user.id);

    // Parse request
    const body: StoryRequest = await req.json();
    const videoQuality = body.videoQuality || 'standard';
    
    console.log('Story request:', {
      duration: body.duration,
      style: body.style,
      platforms: body.platforms.length,
      voiceover: body.includeVoiceover,
      music: body.includeMusic,
      logo: body.includeLogo,
      videoQuality
    });

    // Check usage limits before processing
    const { data: usageCheck, error: usageError } = await supabase.functions.invoke(
      'check-usage-limit',
      { body: { serviceType: 'videos', creditsNeeded: 1 } }
    );

    if (usageError || !usageCheck?.allowed) {
      return new Response(
        JSON.stringify({ 
          error: usageCheck?.message || 'Usage limit exceeded',
          needsUpgrade: usageCheck?.needsUpgrade,
          currentPlan: usageCheck?.currentPlan
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input
    if (!body.storyInput || body.storyInput.trim().length === 0) {
      throw new Error('Story input is required');
    }
    if (!body.platforms || body.platforms.length === 0) {
      throw new Error('At least one platform must be selected');
    }

    // Create video generation record immediately
    const { data: videoRecord, error: insertError } = await supabase
      .from('video_generations')
      .insert({
        user_id: user.id,
        generation_mode: 'story',
        prompt: body.storyInput,
        style: body.style,
        duration_seconds: body.duration,
        platforms: body.platforms,
        status: 'generating',
        video_quality: videoQuality,
        metadata: {
          includeVoiceover: body.includeVoiceover,
          includeMusic: body.includeMusic,
          includeLogo: body.includeLogo,
          stage: 'planning_scenes'
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create video record:', insertError);
      throw insertError;
    }

    console.log('Created video generation record:', videoRecord.id);

    // Background async processing
    const backgroundTask = async () => {
      const startTime = Date.now();
      
      try {
        // Get Vertex AI token and project ID
        const vertexToken = await generateVertexAuthToken();
        const projectId = getVertexProjectId();

        // Stage 1: Plan scenes
        console.log('[Stage 1/6] Planning scenes...');
        await supabase
          .from('video_generations')
          .update({ metadata: { ...videoRecord.metadata, stage: 'planning_scenes' } })
          .eq('id', videoRecord.id);

        const scenes = await planScenes({
          storyInput: body.storyInput,
          duration: body.duration,
          style: body.style,
          numScenes: Math.ceil(body.duration / 8),
          vertexToken,
          projectId
        });

        console.log(`Planned ${scenes.length} scenes`);

        // Save scenes to database
        const sceneInserts = scenes.map((scene, index) => ({
          video_generation_id: videoRecord.id,
          scene_number: index + 1,
          duration_seconds: scene.duration,
          visual_description: scene.visualDescription,
          narration: scene.narration,
          mood: scene.mood
        }));

        await supabase.from('video_story_scenes').insert(sceneInserts);

        // Stage 2: Generate scene images
        console.log('[Stage 2/6] Generating scene images...');
        await supabase
          .from('video_generations')
          .update({ metadata: { ...videoRecord.metadata, stage: 'generating_images', scenesCount: scenes.length } })
          .eq('id', videoRecord.id);

        const sceneImages = await generateSceneImages({
          scenes,
          style: body.style,
          vertexToken,
          projectId
        });

        console.log(`Generated ${sceneImages.length} scene images`);

        // Update scenes with image URLs
        for (let i = 0; i < sceneImages.length; i++) {
          await supabase
            .from('video_story_scenes')
            .update({ image_url: sceneImages[i].imageUrl })
            .eq('video_generation_id', videoRecord.id)
            .eq('scene_number', i + 1);
        }

        // Stage 3: Generate video clips
        console.log(`[Stage 3/6] Generating video clips with VEO 3.1 (${videoQuality} quality)...`);
        await supabase
          .from('video_generations')
          .update({ metadata: { ...videoRecord.metadata, stage: 'generating_clips' } })
          .eq('id', videoRecord.id);

        const videoClips = await generateVideoClips({
          sceneImages,
          scenes,
          vertexToken,
          quality: videoQuality,
          supabaseUrl,
          supabaseKey
        });

        console.log(`Generated ${videoClips.length} video clips`);

        // Update scenes with video clip URLs
        for (let i = 0; i < videoClips.length; i++) {
          await supabase
            .from('video_story_scenes')
            .update({ 
              video_clip_url: videoClips[i].videoUrl,
              start_time_ms: videoClips[i].startTimeMs,
              end_time_ms: videoClips[i].endTimeMs
            })
            .eq('video_generation_id', videoRecord.id)
            .eq('scene_number', i + 1);
        }

        // Stage 4: Generate audio layers
        console.log('[Stage 4/6] Generating audio layers...');
        await supabase
          .from('video_generations')
          .update({ metadata: { ...videoRecord.metadata, stage: 'generating_audio' } })
          .eq('id', videoRecord.id);

        const audioLayers = await generateAudioLayers({
          scenes,
          includeVoiceover: body.includeVoiceover,
          includeMusic: body.includeMusic,
          style: body.style,
          duration: body.duration,
          vertexToken
        });

        console.log('Audio layers generated');

        // Stage 5: Get user's logo if needed
        let logoUrl = null;
        if (body.includeLogo) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('logo_url')
            .eq('id', user.id)
            .single();
          
          logoUrl = profile?.logo_url;
          if (!logoUrl) throw new Error('Upload a logo before requesting a logo overlay');
          console.log('Logo URL:', logoUrl || 'none');
        }

        if (body.includeVoiceover && !audioLayers.voiceoverUrl) throw new Error('Voiceover generation did not produce audio');
        if (body.includeMusic && !audioLayers.musicUrl) throw new Error('Music generation did not produce audio');

        // Stage 6: Assemble final videos
        console.log('[Stage 6/6] Assembling final videos for platforms...');
        await supabase
          .from('video_generations')
          .update({ metadata: { ...videoRecord.metadata, stage: 'assembling_videos' } })
          .eq('id', videoRecord.id);

        // Account for generation before handing assembly to the durable worker.
        const sceneCost = videoClips.reduce((sum, clip) => sum + clip.cost, 0);
        const totalCost = sceneCost + (body.includeVoiceover ? 0.05 : 0) + 0.02 +
          scenes.length * 0.05 + body.platforms.length * 0.50;
        const { error: costError } = await supabase.from('video_generations')
          .update({ cost_usd: totalCost }).eq('id', videoRecord.id);
        if (costError) throw costError;
        const jobId = await enqueueVideoAssembly({
          videoGenerationId: videoRecord.id,
          videoClips, audioLayers, platforms: body.platforms, duration: body.duration,
          logoUrl, style: body.style, supabaseUrl, supabaseKey,
        });
        console.log('Queued final video assembly:', jobId);

        // Increment usage counter
        await supabase.functions.invoke('increment-usage', {
          body: {
            serviceType: 'videos',
            operationType: 'story_video_generation',
            creditsUsed: 1,
            metadata: { duration: body.duration, numScenes: scenes.length, platforms: body.platforms.length }
          }
        }).catch(error => console.error('Usage accounting failed after export enqueue:', error));

        console.log(`Story generation queued for export, cost: $${totalCost.toFixed(2)}`);

      } catch (error: any) {
        console.error('Background story generation error:', error);
        
        // Update record with error status
        await supabase
          .from('video_generations')
          .update({
            status: 'failed',
            metadata: {
              ...videoRecord.metadata,
              error: error.message,
              errorDetails: error.toString()
            }
          })
          .eq('id', videoRecord.id);
      }
    };

    // Start background processing
    EdgeRuntime.waitUntil(backgroundTask());

    // Estimate cost
    const numScenes = Math.ceil(body.duration / 8);
    const sceneCost = numScenes * 0.64;
    const voiceoverCost = body.includeVoiceover ? 0.05 : 0;
    const planningCost = 0.02;
    const imageCost = numScenes * 0.05;
    const assemblyCost = body.platforms.length * 0.50;
    const estimatedCost = sceneCost + voiceoverCost + planningCost + imageCost + assemblyCost;

    // Return immediately
    return new Response(
      JSON.stringify({
        success: true,
        videoId: videoRecord.id,
        status: 'generating',
        estimatedCost: estimatedCost,
        estimatedScenes: numScenes,
        estimatedTime: '5-10 minutes',
        message: 'Story video generation started. Poll the database for completion status.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Story generation error:', error);
    
    // Handle rate limiting
    if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again in a few minutes.',
          code: 'RATE_LIMIT'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429,
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        error: error.message || 'Story generation failed',
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
