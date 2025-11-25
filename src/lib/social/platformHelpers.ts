import { PLATFORM_CAPABILITIES } from './platformValidation';

export function getPlatformCharCount(text: string, platform: string, mediaCount = 0): number {
  // Twitter counts URLs and media differently
  if (platform.toLowerCase() === 'twitter' || platform.toLowerCase() === 'x') {
    let count = text.length;
    // URLs count as 23 characters
    const urlMatches = text.match(/https?:\/\/\S+/g);
    if (urlMatches) {
      urlMatches.forEach(url => {
        count = count - url.length + 23;
      });
    }
    // Media attachments count as 24 characters
    if (mediaCount > 0) {
      count += 24;
    }
    return count;
  }

  return text.length;
}

export function getRemainingChars(text: string, platform: string, mediaCount = 0): number {
  const capabilities = PLATFORM_CAPABILITIES[platform.toLowerCase() as keyof typeof PLATFORM_CAPABILITIES];
  if (!capabilities) return 0;

  const used = getPlatformCharCount(text, platform, mediaCount);
  return capabilities.maxTextLength - used;
}
