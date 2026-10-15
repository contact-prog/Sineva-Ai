import type { VideoClip } from './video-clip-generator.ts';
import type { AudioLayers } from './video-audio-generator.ts';

export interface FinalVideo {
  platform: string;
  url: string;
  thumbnailUrl: string;
  dimensions: string;
  aspectRatio: string;
  format: 'mp4';
}

export interface AssemblyInput {
  videoClips: VideoClip[];
  audioLayers: AudioLayers;
  platforms: string[];
  duration: number;
  logoUrl: string | null;
  style: string;
}

export const PLATFORM_SPECS = {
  'instagram-post': [1080, 1080],
  'instagram-story': [1080, 1920],
  'instagram-reel': [1080, 1920],
  tiktok: [1080, 1920],
  'youtube-short': [1080, 1920],
  youtube: [1920, 1080],
  'facebook-post': [1080, 1080],
  twitter: [1280, 720],
} as const;

export function validateAssembly(input: AssemblyInput): void {
  if (!Array.isArray(input.platforms) || !input.platforms.length ||
      input.platforms.length > 8 || input.platforms.some(p => !Object.hasOwn(PLATFORM_SPECS, p))) {
    throw new Error('Select supported export platforms');
  }
  if (!Number.isFinite(input.duration) || input.duration <= 0 || input.duration > 300) {
    throw new Error('Export duration must be between 0 and 300 seconds');
  }
  if (typeof input.style !== 'string' || !input.style.trim()) throw new Error('Style is required');
  if (!input.videoClips?.length || input.videoClips.length > 60 || input.videoClips.some(c =>
    !c.videoUrl || !Number.isFinite(c.endTimeMs - c.startTimeMs) || c.endTimeMs <= c.startTimeMs)) {
    throw new Error('Every scene must have a generated clip and positive duration');
  }
}

/** Enqueue only. FFmpeg runs outside the Edge Runtime; results are persisted by the worker. */
export async function enqueueVideoAssembly(params: AssemblyInput & {
  videoGenerationId: string;
  supabaseUrl: string;
  supabaseKey: string;
}): Promise<string> {
  validateAssembly(params);
  const { supabaseUrl, supabaseKey, videoGenerationId, ...input } = params;
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/enqueue_video_export`, {
    method: 'POST',
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ generation_id: videoGenerationId, export_input: input }),
  });
  if (!response.ok) throw new Error(`Could not enqueue video export (${response.status})`);
  return await response.json();
}
