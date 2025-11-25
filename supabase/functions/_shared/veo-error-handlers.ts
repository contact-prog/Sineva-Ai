/**
 * VEO Error Handling Utilities
 * Provides retry logic and fallback mechanisms for VEO API calls
 */

/**
 * Retry a function with exponential backoff for rate limit errors
 */
export async function generateWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let attempt = 0;
  let delay = 1000; // Start with 1 second delay
  
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      
      const errorMessage = error.message || '';
      const isRateLimitError = 
        errorMessage.includes('429') || 
        errorMessage.includes('rate limit') ||
        errorMessage.includes('quota exceeded') ||
        errorMessage.includes('too many requests');
      
      // Check if it's a retryable error (rate limit)
      if (isRateLimitError) {
        if (attempt >= maxRetries) {
          throw new Error(`Rate limit exceeded after ${maxRetries} retries`);
        }
        
        console.log(`Rate limited, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff: 1s, 2s, 4s, etc.
      } else {
        // Non-retryable error - throw immediately
        throw error;
      }
    }
  }
  
  throw new Error('Max retries exceeded');
}

/**
 * Try multiple models with fallback logic
 * Attempts primary model first, then falls back to faster models
 */
export async function generateWithFallback<T>(
  primaryFn: () => Promise<T>,
  fallbackFn: () => Promise<T>
): Promise<T> {
  try {
    console.log('Attempting primary model...');
    return await primaryFn();
  } catch (error) {
    console.error('Primary model failed:', error);
    console.log('Attempting fallback model...');
    
    try {
      return await fallbackFn();
    } catch (fallbackError) {
      console.error('Fallback model also failed:', fallbackError);
      throw new Error('All models failed during generation');
    }
  }
}

/**
 * Parse VEO API errors and provide detailed error information
 */
export function parseVeoError(error: any): {
  type: 'rate_limit' | 'content_policy' | 'timeout' | 'auth' | 'unknown';
  message: string;
  retryable: boolean;
  suggestedDelay?: number;
} {
  const errorMessage = error.message || '';
  
  // Rate limit errors
  if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
    return {
      type: 'rate_limit',
      message: 'Rate limit exceeded. VEO allows 1 request per second.',
      retryable: true,
      suggestedDelay: 2000
    };
  }
  
  // Content policy violations
  if (errorMessage.includes('content policy') || errorMessage.includes('safety')) {
    return {
      type: 'content_policy',
      message: 'Content policy violation. Please modify your prompt.',
      retryable: false
    };
  }
  
  // Timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('deadline exceeded')) {
    return {
      type: 'timeout',
      message: 'Request timed out. The video generation took too long.',
      retryable: true,
      suggestedDelay: 5000
    };
  }
  
  // Authentication errors
  if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('auth')) {
    return {
      type: 'auth',
      message: 'Authentication failed. Please check your Vertex AI credentials.',
      retryable: false
    };
  }
  
  // Unknown errors
  return {
    type: 'unknown',
    message: errorMessage || 'An unknown error occurred',
    retryable: false
  };
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: any): boolean {
  const parsedError = parseVeoError(error);
  return parsedError.retryable;
}
