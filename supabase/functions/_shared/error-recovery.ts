/**
 * PHASE 1.5: Error Recovery & Learning
 * Intelligent error handling, retry logic, and failure learning
 */

interface ErrorContext {
  toolName: string;
  params: Record<string, any>;
  errorMessage: string;
  errorType: string;
  attempt: number;
}

interface RecoveryStrategy {
  action: 'retry' | 'alternative' | 'abort' | 'simplify';
  reason: string;
  modifiedParams?: Record<string, any>;
  alternativeTool?: string;
  userMessage: string;
}

interface ErrorPattern {
  errorType: string;
  count: number;
  successfulRecoveries: string[];
  failedRecoveries: string[];
}

/**
 * Determine optimal recovery strategy based on error type and history
 */
export async function determineRecoveryStrategy(
  errorContext: ErrorContext,
  supabase: any,
  userId?: string
): Promise<RecoveryStrategy> {
  const { toolName, params, errorMessage, errorType, attempt } = errorContext;

  // Learn from past error patterns
  let errorPatterns: Record<string, ErrorPattern> = {};
  if (userId) {
    const { data } = await supabase
      .from('user_memory')
      .select('value')
      .eq('user_id', userId)
      .eq('memory_type', 'pattern')
      .eq('key', 'error_patterns')
      .single();

    errorPatterns = data?.value || {};
  }

  // Check if we've seen this error before
  const knownPattern = errorPatterns[errorType];

  // Max retry attempts
  const MAX_RETRIES = 3;

  // Strategy determination logic
  if (attempt >= MAX_RETRIES) {
    return {
      action: 'abort',
      reason: 'Maximum retry attempts reached',
      userMessage: `I've tried ${MAX_RETRIES} times but couldn't complete this action. ${suggestAlternative(toolName, errorType)}`
    };
  }

  // Handle specific error types
  if (errorType.includes('timeout') || errorType.includes('rate_limit')) {
    return {
      action: 'retry',
      reason: 'Temporary service issue, retry with backoff',
      userMessage: `The service is busy. Let me try again in a moment...`
    };
  }

  if (errorType.includes('invalid_parameter') || errorType.includes('validation')) {
    // Try to fix parameter issues
    const fixedParams = autoCorrectParams(params, errorMessage);
    
    if (fixedParams !== params) {
      return {
        action: 'retry',
        reason: 'Auto-corrected invalid parameters',
        modifiedParams: fixedParams,
        userMessage: `I detected an issue with the parameters. Let me adjust and try again...`
      };
    }
    
    return {
      action: 'simplify',
      reason: 'Simplify complex parameters',
      modifiedParams: simplifyParams(params),
      userMessage: `Let me try with simpler parameters...`
    };
  }

  if (errorType.includes('not_found') || errorType.includes('missing')) {
    return {
      action: 'alternative',
      reason: 'Resource not available, trying alternative approach',
      alternativeTool: findAlternativeTool(toolName),
      userMessage: `That approach didn't work. Let me try a different method...`
    };
  }

  if (errorType.includes('permission') || errorType.includes('unauthorized')) {
    return {
      action: 'abort',
      reason: 'Permission denied, cannot recover automatically',
      userMessage: `I don't have permission to do that. Please check your integration settings or account permissions.`
    };
  }

  // Check if we've successfully recovered from this error before
  if (knownPattern?.successfulRecoveries && knownPattern.successfulRecoveries.length > 0) {
    const lastSuccessful = knownPattern.successfulRecoveries[0];
    return {
      action: 'retry',
      reason: `Previously recovered using: ${lastSuccessful}`,
      userMessage: `I've encountered this before. Let me apply a fix that worked previously...`
    };
  }

  // Default: retry with slight modification
  return {
    action: 'retry',
    reason: 'Unknown error, retrying with adjusted parameters',
    modifiedParams: adjustParamsForRetry(params, attempt),
    userMessage: `Something went wrong. Let me try a different approach...`
  };
}

/**
 * Execute recovery strategy with intelligent retry logic
 */
export async function executeRecovery(
  strategy: RecoveryStrategy,
  errorContext: ErrorContext,
  supabase: any,
  userId?: string
): Promise<{ recovered: boolean; result?: any; error?: string }> {
  const { action, modifiedParams, alternativeTool } = strategy;

  try {
    switch (action) {
      case 'retry':
        // Exponential backoff
        const backoffMs = Math.min(1000 * Math.pow(2, errorContext.attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, backoffMs));

        // Retry with modified params
        const retryParams = modifiedParams || errorContext.params;
        const retryResult = await invokeTool(errorContext.toolName, retryParams, supabase);
        
        // Record successful recovery
        if (userId) {
          await recordRecoverySuccess(
            supabase,
            userId,
            errorContext.errorType,
            'retry_with_backoff'
          );
        }

        return { recovered: true, result: retryResult };

      case 'alternative':
        if (!alternativeTool) {
          return { recovered: false, error: 'No alternative tool available' };
        }

        const altResult = await invokeTool(alternativeTool, errorContext.params, supabase);
        
        if (userId) {
          await recordRecoverySuccess(
            supabase,
            userId,
            errorContext.errorType,
            `alternative_tool:${alternativeTool}`
          );
        }

        return { recovered: true, result: altResult };

      case 'simplify':
        const simplifiedParams = modifiedParams || simplifyParams(errorContext.params);
        const simplifiedResult = await invokeTool(errorContext.toolName, simplifiedParams, supabase);
        
        if (userId) {
          await recordRecoverySuccess(
            supabase,
            userId,
            errorContext.errorType,
            'parameter_simplification'
          );
        }

        return { recovered: true, result: simplifiedResult };

      case 'abort':
        return { recovered: false, error: strategy.reason };

      default:
        return { recovered: false, error: 'Unknown recovery action' };
    }
  } catch (error) {
    // Record failed recovery attempt
    if (userId) {
      await recordRecoveryFailure(
        supabase,
        userId,
        errorContext.errorType,
        action
      );
    }

    return { 
      recovered: false, 
      error: error instanceof Error ? error.message : 'Recovery failed' 
    };
  }
}

// Helper functions
async function invokeTool(toolName: string, params: Record<string, any>, supabase: any): Promise<any> {
  const { data, error } = await supabase.functions.invoke(toolName, { body: params });
  if (error) throw error;
  return data;
}

function autoCorrectParams(params: Record<string, any>, errorMessage: string): Record<string, any> {
  const corrected = { ...params };
  
  // Common corrections
  if (errorMessage.includes('platforms') && typeof corrected.platform === 'string') {
    corrected.platforms = [corrected.platform];
    delete corrected.platform;
  }
  
  if (errorMessage.includes('required') && errorMessage.includes('tone')) {
    corrected.tone = corrected.tone || 'professional';
  }

  return corrected;
}

function simplifyParams(params: Record<string, any>): Record<string, any> {
  const simplified = { ...params };
  
  // Remove optional/advanced parameters
  delete simplified.advancedOptions;
  delete simplified.customizations;
  delete simplified.metadata;
  
  // Simplify complex arrays
  if (Array.isArray(simplified.platforms) && simplified.platforms.length > 3) {
    simplified.platforms = simplified.platforms.slice(0, 3);
  }

  return simplified;
}

function adjustParamsForRetry(params: Record<string, any>, attempt: number): Record<string, any> {
  const adjusted = { ...params };
  
  // Add retry metadata
  adjusted._retryAttempt = attempt;
  
  // Slightly randomize to avoid hitting same issue
  if (adjusted.timeout) {
    adjusted.timeout = adjusted.timeout * (1 + attempt * 0.2);
  }

  return adjusted;
}

function findAlternativeTool(toolName: string): string | undefined {
  const alternatives: Record<string, string> = {
    'generate_graphic': 'generate_graphic_preview',
    'generate_video': 'generate_video_quick',
    'publish_social_post': 'schedule_social_post',
  };

  return alternatives[toolName];
}

function suggestAlternative(toolName: string, errorType: string): string {
  if (toolName.includes('graphic')) {
    return 'Would you like me to try creating a simpler version?';
  }
  if (toolName.includes('video')) {
    return 'Would you like me to try a shorter video format?';
  }
  if (toolName.includes('publish')) {
    return 'Would you like to schedule it for later instead?';
  }
  return 'Would you like to try a different approach?';
}

async function recordRecoverySuccess(
  supabase: any,
  userId: string,
  errorType: string,
  recoveryMethod: string
): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('user_memory')
      .select('value')
      .eq('user_id', userId)
      .eq('memory_type', 'pattern')
      .eq('key', 'error_patterns')
      .single();

    const patterns = existing?.value || {};
    
    if (!patterns[errorType]) {
      patterns[errorType] = {
        errorType,
        count: 0,
        successfulRecoveries: [],
        failedRecoveries: []
      };
    }

    patterns[errorType].successfulRecoveries.unshift(recoveryMethod);
    patterns[errorType].successfulRecoveries = patterns[errorType].successfulRecoveries.slice(0, 5);

    await supabase
      .from('user_memory')
      .upsert({
        user_id: userId,
        memory_type: 'pattern',
        key: 'error_patterns',
        value: patterns,
        updated_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('[Recovery] Failed to record success:', error);
  }
}

async function recordRecoveryFailure(
  supabase: any,
  userId: string,
  errorType: string,
  recoveryMethod: string
): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('user_memory')
      .select('value')
      .eq('user_id', userId)
      .eq('memory_type', 'pattern')
      .eq('key', 'error_patterns')
      .single();

    const patterns = existing?.value || {};
    
    if (!patterns[errorType]) {
      patterns[errorType] = {
        errorType,
        count: 0,
        successfulRecoveries: [],
        failedRecoveries: []
      };
    }

    patterns[errorType].count += 1;
    patterns[errorType].failedRecoveries.unshift(recoveryMethod);
    patterns[errorType].failedRecoveries = patterns[errorType].failedRecoveries.slice(0, 5);

    await supabase
      .from('user_memory')
      .upsert({
        user_id: userId,
        memory_type: 'pattern',
        key: 'error_patterns',
        value: patterns,
        updated_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('[Recovery] Failed to record failure:', error);
  }
}
