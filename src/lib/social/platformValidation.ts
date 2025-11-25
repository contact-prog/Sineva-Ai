export const CALENDAR_PLATFORMS = ['facebook', 'instagram', 'linkedin', 'twitter', 'pinterest'];

export const PLATFORM_CAPABILITIES: Record<string, {
  maxTextLength: number;
  supportedContentTypes: string[];
  maxImages?: number;
  maxVideoDurationSeconds: number;
  maxVideoSizeMB: number;
  requiresMedia?: boolean;
}> = {
  facebook: {
    maxTextLength: 63206,
    supportedContentTypes: ['text', 'image', 'video', 'link'],
    maxImages: 10,
    maxVideoDurationSeconds: 240 * 60,
    maxVideoSizeMB: 4096,
  },
  instagram: {
    maxTextLength: 2200,
    supportedContentTypes: ['image', 'video'],
    maxImages: 10,
    maxVideoDurationSeconds: 60,
    maxVideoSizeMB: 100,
    requiresMedia: true,
  },
  linkedin: {
    maxTextLength: 3000,
    supportedContentTypes: ['text', 'image', 'video', 'link'],
    maxImages: 20,
    maxVideoDurationSeconds: 10 * 60,
    maxVideoSizeMB: 200,
  },
  twitter: {
    maxTextLength: 280,
    supportedContentTypes: ['text', 'image', 'video'],
    maxImages: 4,
    maxVideoDurationSeconds: 140,
    maxVideoSizeMB: 512,
  },
  pinterest: {
    maxTextLength: 500,
    supportedContentTypes: ['image'],
    maxImages: 1,
    maxVideoDurationSeconds: 0,
    maxVideoSizeMB: 0,
    requiresMedia: true,
  },
  youtube: {
    maxTextLength: 5000,
    supportedContentTypes: ['video'],
    maxVideoDurationSeconds: 12 * 60 * 60,
    maxVideoSizeMB: 256 * 1024,
    requiresMedia: true,
  },
};

export function getPlatformDisplayName(platform: string): string {
  const names: Record<string, string> = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    linkedin: 'LinkedIn',
    twitter: 'Twitter/X',
    pinterest: 'Pinterest',
    youtube: 'YouTube',
    x: 'Twitter/X',
  };
  return names[platform.toLowerCase()] || platform;
}

export function getContentTypeFromMedia(mediaUrls: string[]): 'text' | 'image' | 'video' | 'mixed' {
  if (!mediaUrls || mediaUrls.length === 0) return 'text';
  
  const hasVideo = mediaUrls.some(url => /\.(mp4|mov|avi|webm)$/i.test(url));
  const hasImage = mediaUrls.some(url => /\.(jpg|jpeg|png|gif|webp)$/i.test(url));
  
  if (hasVideo && hasImage) return 'mixed';
  if (hasVideo) return 'video';
  if (hasImage) return 'image';
  return 'text';
}

export function validateContentForPlatform(
  platform: string,
  content: { text: string; mediaUrls: string[]; contentType: string }
): { valid: boolean; errors: string[]; warnings: string[] } {
  const capabilities = PLATFORM_CAPABILITIES[platform.toLowerCase() as keyof typeof PLATFORM_CAPABILITIES];
  if (!capabilities) {
    return { valid: false, errors: ['Platform not supported'], warnings: [] };
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  // Text length validation
  if (content.text.length > capabilities.maxTextLength) {
    errors.push(`Text exceeds ${capabilities.maxTextLength} characters`);
  }

  // Media requirement
  if (capabilities.requiresMedia && content.mediaUrls.length === 0) {
    errors.push('This platform requires at least one media file');
  }

  // Content type support
  if (content.contentType !== 'text' && !capabilities.supportedContentTypes.includes(content.contentType)) {
    errors.push(`${content.contentType} not supported on this platform`);
  }

  // Media count
  if (content.contentType === 'image' && capabilities.maxImages && content.mediaUrls.length > capabilities.maxImages) {
    errors.push(`Maximum ${capabilities.maxImages} images allowed`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
