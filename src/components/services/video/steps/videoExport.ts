export interface PlatformVideo {
  platform: string;
  url: string;
  thumbnailUrl?: string;
  dimensions: string;
  aspectRatio: string;
  format: 'mp4';
}

interface ExportOptions {
  duration: number;
  style: string;
  platforms: string[];
  includeVoiceover: boolean;
  includeMusic: boolean;
  includeLogo: boolean;
}

export function assemblyRequest(videoGenerationId: string, options: ExportOptions) {
  return { videoGenerationId, ...options, action: 'start' };
}

export function completedVideos(data: { status: string; videos?: PlatformVideo[]; error?: string }): PlatformVideo[] | null {
  if (data.status === 'failed') throw new Error(data.error || 'Video export failed');
  if (data.status !== 'completed') return null;
  if (!Array.isArray(data.videos) || !data.videos.length || data.videos.some(v => !v.url)) {
    throw new Error('Export completed without downloadable videos');
  }
  return data.videos;
}
