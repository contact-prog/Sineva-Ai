export function validateMediaForPlatform(
  platform: string,
  mediaUrls: string[]
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Add validation logic here as needed

  return { valid: errors.length === 0, errors, warnings };
}

export function getMediaRecommendations(platform: string): string[] {
  const recommendations: Record<string, string[]> = {
    instagram: ['Use high-quality images (1080x1080 minimum)', 'Videos should be 15-60 seconds'],
    facebook: ['Images work best at 1200x630', 'Videos up to 4 hours supported'],
    twitter: ['Images up to 5MB', 'Videos up to 512MB, max 2:20 duration'],
    linkedin: ['Professional images recommended', 'Videos up to 10 minutes'],
  };

  return recommendations[platform.toLowerCase()] || [];
}
