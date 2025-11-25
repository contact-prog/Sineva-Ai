/**
 * Simple cost estimation for image generation
 */

export function estimateImageCost(model: string): number {
  const pricing: Record<string, number> = {
    'gemini-3-pro-image-preview': 0.12,  // Gemini 3 Pro Image (Nano banana pro)
    'gemini-2.5-flash-image': 0.04  // Fallback (if ever needed)
  };
  
  return pricing[model] || 0.12;  // Default to Gemini 3 Pro Image price
}
