/**
 * Cost Estimation Utility for AI Model Usage
 * Provides accurate cost estimates based on 2025 Vertex AI pricing
 */

export interface CostEstimateParams {
  model: string;
  operation: 'generation' | 'editing' | 'chat';
  inputTokens?: number;
  outputTokens?: number;
  imageCount?: number;
}

export interface ModelPricing {
  inputPer1M?: number;  // Cost per 1M input tokens
  outputPer1M?: number; // Cost per 1M output tokens
  perImage?: number;    // Cost per image
  perRequest?: number;  // Flat cost per request
}

// 2025 Vertex AI Pricing (approximate - adjust based on actual pricing)
const PRICING_TABLE: Record<string, ModelPricing> = {
  // Gemini 3.0 Models
  'gemini-3.0-pro': {
    inputPer1M: 1.25,
    outputPer1M: 5.00
  },
  'gemini-3.0-flash': {
    inputPer1M: 0.20,
    outputPer1M: 0.60
  },
  
  // Gemini 2.5 Models (fallback)
  'gemini-2.5-pro': {
    inputPer1M: 1.00,
    outputPer1M: 4.00
  },
  'gemini-2.5-flash': {
    inputPer1M: 0.10,
    outputPer1M: 0.30
  },
  
  // Image Models
  'imagen-4': {
    perImage: 0.15
  },
  'imagen-3.0-generate-001': {
    perImage: 0.10
  },
  'gemini-3.0-pro-image': {
    perImage: 0.12,
    inputPer1M: 1.25,  // For text prompts
    outputPer1M: 5.00
  },
  'gemini-2.5-flash-image': {
    perImage: 0.08,
    inputPer1M: 0.10,
    outputPer1M: 0.30
  }
};

/**
 * Estimate cost for AI model usage
 */
export function estimateCost(params: CostEstimateParams): number {
  const { model, operation, inputTokens = 0, outputTokens = 0, imageCount = 1 } = params;
  
  // Normalize model name (handle version suffixes)
  const normalizedModel = normalizeModelName(model);
  const pricing = PRICING_TABLE[normalizedModel];
  
  if (!pricing) {
    console.warn(`No pricing data for model: ${model}, returning 0 cost estimate`);
    return 0;
  }
  
  let cost = 0;
  
  // Calculate based on operation type
  switch (operation) {
    case 'chat':
      if (pricing.inputPer1M && pricing.outputPer1M) {
        cost = (inputTokens / 1_000_000 * pricing.inputPer1M) + 
               (outputTokens / 1_000_000 * pricing.outputPer1M);
      }
      break;
      
    case 'generation':
    case 'editing':
      // Image operations
      if (pricing.perImage) {
        cost = pricing.perImage * imageCount;
      }
      
      // Add prompt processing cost if available
      if (pricing.inputPer1M && inputTokens > 0) {
        cost += inputTokens / 1_000_000 * pricing.inputPer1M;
      }
      break;
  }
  
  // Add flat request cost if applicable
  if (pricing.perRequest) {
    cost += pricing.perRequest;
  }
  
  return Math.round(cost * 10000) / 10000; // Round to 4 decimal places
}

/**
 * Normalize model name to match pricing table keys
 */
function normalizeModelName(model: string): string {
  // Remove common suffixes
  const suffixes = [':predict', ':generateContent', ':streamGenerateContent', '-001', '-preview'];
  let normalized = model;
  
  for (const suffix of suffixes) {
    if (normalized.endsWith(suffix)) {
      normalized = normalized.slice(0, -suffix.length);
    }
  }
  
  return normalized;
}

/**
 * Estimate tokens from text (rough approximation)
 * 1 token ≈ 4 characters for English
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Get model family from model name
 */
export function getModelFamily(model: string): string {
  if (model.includes('gemini')) return 'gemini';
  if (model.includes('imagen')) return 'imagen';
  if (model.includes('runway')) return 'runway';
  if (model.includes('stable-diffusion') || model.includes('sd-')) return 'stable-diffusion';
  return 'unknown';
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) return '<$0.01';
  return `$${cost.toFixed(4)}`;
}
