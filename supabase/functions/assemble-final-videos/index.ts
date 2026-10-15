import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { enqueueVideoAssembly } from '../_shared/video-assembler.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const client = createClient(supabaseUrl, supabaseKey);
    const token = req.headers.get('Authorization')?.replace(/^Bearer /, '');
    if (!token) return json({ error: 'Missing authorization header' }, 401);
    const { data: { user }, error: authError } = await client.auth.getUser(token);
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json();
    if (typeof body.videoGenerationId !== 'string') return json({ error: 'Video ID required' }, 400);
    // Service-role queries bypass RLS: explicitly scope every generation lookup to its owner.
    const { data: generation, error: genError } = await client.from('video_generations')
      .select('*').eq('id', body.videoGenerationId).eq('user_id', user.id).maybeSingle();
    if (genError) throw genError;
    if (!generation) return json({ error: 'Video not found' }, 404);

    if (body.action === 'status') {
      if (typeof body.jobId !== 'string') return json({ error: 'Job ID required' }, 400);
      const { data: job, error } = await client.from('video_export_jobs')
        .select('id,status,result,error').eq('id', body.jobId)
        .eq('video_generation_id', generation.id).maybeSingle();
      if (error) throw error;
      if (!job) return json({ error: 'Export not found' }, 404);
      return json({ jobId: job.id, status: job.status, videos: job.result || [], error: job.error });
    }
    if (body.action && body.action !== 'start') return json({ error: 'Unknown action' }, 400);
    const { data: scenes, error: sceneError } = await client.from('video_story_scenes')
      .select('*').eq('video_generation_id', generation.id).order('scene_number');
    if (sceneError) throw sceneError;
    let logoUrl = null;
    if (body.includeLogo) {
      const { data: profile, error } = await client.from('user_profiles').select('logo_url').eq('id', user.id).single();
      if (error) throw error;
      if (!profile?.logo_url) return json({ error: 'Upload a logo before requesting a logo overlay' }, 400);
      logoUrl = profile.logo_url;
    }
    if (body.includeVoiceover && !generation.voiceover_url) return json({ error: 'Voiceover is not ready' }, 400);
    if (body.includeMusic && !generation.music_url) return json({ error: 'Music is not ready' }, 400);
    let elapsedMs = 0;
    const videoClips = (scenes || []).map(scene => {
      const startTimeMs = elapsedMs;
      elapsedMs += scene.duration_seconds * 1000;
      return {
        sceneNumber: scene.scene_number, videoUrl: scene.video_clip_url,
        startTimeMs, endTimeMs: elapsedMs,
        cost: scene.generation_cost || 0, modelUsed: scene.veo_model_used || 'veo-fast',
      };
    });
    try {
      const jobId = await enqueueVideoAssembly({
        videoGenerationId: generation.id, videoClips,
        audioLayers: {
          voiceoverUrl: body.includeVoiceover ? generation.voiceover_url : undefined,
          musicUrl: body.includeMusic ? generation.music_url : undefined,
        },
        platforms: body.platforms, duration: body.duration, style: body.style,
        logoUrl, supabaseUrl, supabaseKey,
      });
      return json({ success: true, jobId, status: 'queued', videos: [] }, 202);
    } catch (error) {
      // Validation errors do not enqueue a job or change the generation status.
      if (error instanceof Error && !error.message.startsWith('Could not enqueue')) {
        return json({ error: error.message }, 400);
      }
      throw error;
    }
  } catch (error) {
    console.error('Video assembly request failed:', error);
    return json({ error: 'Unable to process video export request' }, 500);
  }
});
