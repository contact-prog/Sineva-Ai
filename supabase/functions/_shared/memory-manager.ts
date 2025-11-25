/**
 * Memory Management for AI Chat
 * Handles storing, retrieving, and updating user preferences, patterns, and learned behaviors
 */

interface Memory {
  memory_type: 'preference' | 'pattern' | 'workflow' | 'brand_context';
  category?: string;
  key: string;
  value: any;
  confidence_score?: number;
  usage_count?: number;
}

interface MemoryContext {
  preferences?: Record<string, any>;
  patterns?: Record<string, any>;
  successful_workflows?: any[];
  brand_context?: Record<string, any>;
}

/**
 * Retrieve user memory context from database
 */
export async function getUserMemoryContext(
  supabase: any,
  userId: string,
  category?: string
): Promise<MemoryContext> {
  try {
    const { data, error } = await supabase
      .rpc('get_user_memory_context', {
        p_user_id: userId,
        p_category: category || null
      });

    if (error) {
      console.error('[Memory] Error fetching memory context:', error);
      return {};
    }

    return data || {};
  } catch (error) {
    console.error('[Memory] Failed to get memory context:', error);
    return {};
  }
}

/**
 * Store or update a memory entry
 */
export async function upsertMemory(
  supabase: any,
  userId: string,
  memory: Memory
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_memory')
      .upsert({
        user_id: userId,
        memory_type: memory.memory_type,
        category: memory.category || null,
        key: memory.key,
        value: memory.value,
        confidence_score: memory.confidence_score || 1.0,
        usage_count: memory.usage_count || 1,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,memory_type,category,key',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('[Memory] Error upserting memory:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Memory] Failed to upsert memory:', error);
    return false;
  }
}

/**
 * Increment usage count for a memory
 */
export async function incrementMemoryUsage(
  supabase: any,
  userId: string,
  memoryType: string,
  category: string | null,
  key: string
): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('user_memory')
      .select('usage_count, confidence_score')
      .eq('user_id', userId)
      .eq('memory_type', memoryType)
      .eq('category', category)
      .eq('key', key)
      .single();

    if (existing) {
      const newUsageCount = (existing.usage_count || 0) + 1;
      const newConfidence = Math.min(1.0, existing.confidence_score + 0.05);

      await supabase
        .from('user_memory')
        .update({
          usage_count: newUsageCount,
          confidence_score: newConfidence,
          last_used_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('memory_type', memoryType)
        .eq('category', category)
        .eq('key', key);
    }
  } catch (error) {
    console.error('[Memory] Failed to increment usage:', error);
  }
}

/**
 * PHASE 1.3: Extract and store preferences from user interactions
 * Enhanced with workflow pattern tracking and success rate analysis
 */
export async function learnFromInteraction(
  supabase: any,
  userId: string,
  interaction: {
    service?: string;
    params?: Record<string, any>;
    success: boolean;
    userFeedback?: string;
    executionTime?: number;
    errorType?: string;
  }
): Promise<void> {
  try {
    const { service, params, success, userFeedback, executionTime, errorType } = interaction;

    if (!params) return;

    // Track success/failure patterns for learning
    if (service) {
      const patternKey = `${service}_success_rate`;
      const { data: existingPattern } = await supabase
        .from('user_memory')
        .select('value, usage_count')
        .eq('user_id', userId)
        .eq('memory_type', 'pattern')
        .eq('key', patternKey)
        .single();

      const currentStats = existingPattern?.value || { successes: 0, failures: 0, avgTime: 0 };
      
      if (success) {
        currentStats.successes = (currentStats.successes || 0) + 1;
        currentStats.lastSuccess = new Date().toISOString();
        if (executionTime) {
          const total = (currentStats.successes + currentStats.failures);
          currentStats.avgTime = ((currentStats.avgTime || 0) * (total - 1) + executionTime) / total;
        }
      } else {
        currentStats.failures = (currentStats.failures || 0) + 1;
        currentStats.lastFailure = new Date().toISOString();
        if (errorType) {
          currentStats.commonErrors = currentStats.commonErrors || {};
          currentStats.commonErrors[errorType] = (currentStats.commonErrors[errorType] || 0) + 1;
        }
      }

      await upsertMemory(supabase, userId, {
        memory_type: 'pattern',
        category: service,
        key: patternKey,
        value: currentStats,
        confidence_score: Math.min(1.0, (currentStats.successes / (currentStats.successes + currentStats.failures)))
      });
    }

    // Only learn preferences from successful interactions
    if (!success) return;

    // Learn tone preferences with frequency tracking
    if (params.tone) {
      const toneKey = 'preferred_tone';
      const { data: existing } = await supabase
        .from('user_memory')
        .select('value, usage_count')
        .eq('user_id', userId)
        .eq('memory_type', 'preference')
        .eq('category', service)
        .eq('key', toneKey)
        .single();

      const toneStats = existing?.value || {};
      toneStats[params.tone] = (toneStats[params.tone] || 0) + 1;
      
      await upsertMemory(supabase, userId, {
        memory_type: 'preference',
        category: service,
        key: toneKey,
        value: toneStats,
        confidence_score: 0.8,
        usage_count: (existing?.usage_count || 0) + 1
      });
    }

    // Learn platform preferences with performance tracking
    if (params.platforms || params.platform) {
      const platforms = params.platforms || [params.platform];
      const platformKey = 'preferred_platforms';
      
      const { data: existing } = await supabase
        .from('user_memory')
        .select('value, usage_count')
        .eq('user_id', userId)
        .eq('memory_type', 'preference')
        .eq('category', service)
        .eq('key', platformKey)
        .single();

      const platformStats = existing?.value || {};
      platforms.forEach((p: string) => {
        platformStats[p] = {
          count: (platformStats[p]?.count || 0) + 1,
          lastUsed: new Date().toISOString()
        };
      });

      await upsertMemory(supabase, userId, {
        memory_type: 'preference',
        category: service,
        key: platformKey,
        value: platformStats,
        confidence_score: 0.85,
        usage_count: (existing?.usage_count || 0) + 1
      });
    }

    // Learn content type preferences
    if (params.contentType) {
      await upsertMemory(supabase, userId, {
        memory_type: 'preference',
        category: service,
        key: 'preferred_content_type',
        value: { contentType: params.contentType, last_used: new Date().toISOString() },
        confidence_score: 0.75
      });
    }

    // PHASE 1.3: Track time-of-day patterns
    const hour = new Date().getHours();
    const timeSlot = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    
    const { data: timePattern } = await supabase
      .from('user_memory')
      .select('value')
      .eq('user_id', userId)
      .eq('memory_type', 'pattern')
      .eq('key', 'activity_by_time')
      .single();

    const timeStats = timePattern?.value || { morning: 0, afternoon: 0, evening: 0 };
    timeStats[timeSlot] = (timeStats[timeSlot] || 0) + 1;

    await upsertMemory(supabase, userId, {
      memory_type: 'pattern',
      key: 'activity_by_time',
      value: timeStats,
      confidence_score: 0.9
    });

    // Store successful workflow pattern
    if (service && userFeedback !== 'negative') {
      await upsertMemory(supabase, userId, {
        memory_type: 'workflow',
        category: service,
        key: `successful_${service}_params`,
        value: {
          params: params,
          timestamp: new Date().toISOString(),
          executionTime: executionTime
        },
        confidence_score: 0.9
      });
    }

  } catch (error) {
    console.error('[Memory] Failed to learn from interaction:', error);
  }
}

/**
 * PHASE 1.3: Get optimal posting times based on user patterns
 */
export async function getOptimalPostingTimes(
  supabase: any,
  userId: string,
  platform?: string
): Promise<{ hour: number; confidence: number }[]> {
  try {
    const { data } = await supabase
      .from('user_memory')
      .select('value')
      .eq('user_id', userId)
      .eq('memory_type', 'pattern')
      .eq('key', 'activity_by_time')
      .single();

    if (!data?.value) return [];

    const timeStats = data.value;
    const total = (timeStats.morning || 0) + (timeStats.afternoon || 0) + (timeStats.evening || 0);
    
    if (total === 0) return [];

    const suggestions = [
      { hour: 9, confidence: (timeStats.morning || 0) / total },
      { hour: 14, confidence: (timeStats.afternoon || 0) / total },
      { hour: 19, confidence: (timeStats.evening || 0) / total }
    ];

    return suggestions.filter(s => s.confidence > 0).sort((a, b) => b.confidence - a.confidence);
  } catch (error) {
    console.error('[Memory] Failed to get optimal times:', error);
    return [];
  }
}

/**
 * PHASE 1.3: Get most successful parameter combinations
 */
export async function getBestPractices(
  supabase: any,
  userId: string,
  service: string
): Promise<Record<string, any> | null> {
  try {
    const { data } = await supabase
      .from('user_memory')
      .select('value')
      .eq('user_id', userId)
      .eq('memory_type', 'workflow')
      .eq('category', service)
      .eq('key', `successful_${service}_params`)
      .order('confidence_score', { ascending: false })
      .limit(1)
      .single();

    return data?.value?.params || null;
  } catch (error) {
    return null;
  }
}

/**
 * Build enriched system prompt with memory context
 */
export function buildSystemPromptWithMemory(
  basePrompt: string,
  memoryContext: MemoryContext,
  brandProfile?: any
): string {
  let enrichedPrompt = basePrompt;

  // Add brand context from memory
  if (memoryContext.brand_context && Object.keys(memoryContext.brand_context).length > 0) {
    enrichedPrompt += '\n\n## Brand Context (from memory):\n';
    Object.entries(memoryContext.brand_context).forEach(([key, value]) => {
      enrichedPrompt += `- ${key}: ${JSON.stringify(value)}\n`;
    });
  }

  // Add user preferences
  if (memoryContext.preferences && Object.keys(memoryContext.preferences).length > 0) {
    enrichedPrompt += '\n\n## User Preferences (learned):\n';
    Object.entries(memoryContext.preferences).forEach(([key, value]) => {
      enrichedPrompt += `- ${key}: ${JSON.stringify(value)}\n`;
    });
  }

  // Add successful patterns
  if (memoryContext.patterns && Object.keys(memoryContext.patterns).length > 0) {
    enrichedPrompt += '\n\n## Learned Patterns (what works well for this user):\n';
    Object.entries(memoryContext.patterns).forEach(([key, value]) => {
      enrichedPrompt += `- ${key}: ${JSON.stringify(value)}\n`;
    });
  }

  // Add successful workflow examples
  if (memoryContext.successful_workflows && memoryContext.successful_workflows.length > 0) {
    enrichedPrompt += '\n\n## Successful Past Workflows:\n';
    memoryContext.successful_workflows.slice(0, 3).forEach((workflow, i) => {
      enrichedPrompt += `${i + 1}. ${JSON.stringify(workflow)}\n`;
    });
  }

  enrichedPrompt += '\n\nUse this context to personalize your responses and suggestions based on what you know about the user.';

  return enrichedPrompt;
}

/**
 * Initialize brand context in memory from user profile
 */
export async function initializeBrandMemory(
  supabase: any,
  userId: string,
  brandProfile: any
): Promise<void> {
  try {
    const brandMemories: Memory[] = [];

    if (brandProfile.brand_voice) {
      brandMemories.push({
        memory_type: 'brand_context',
        key: 'brand_voice',
        value: brandProfile.brand_voice,
        confidence_score: 1.0
      });
    }

    if (brandProfile.company_name) {
      brandMemories.push({
        memory_type: 'brand_context',
        key: 'company_name',
        value: brandProfile.company_name,
        confidence_score: 1.0
      });
    }

    if (brandProfile.industry) {
      brandMemories.push({
        memory_type: 'brand_context',
        key: 'industry',
        value: brandProfile.industry,
        confidence_score: 1.0
      });
    }

    if (brandProfile.target_audience) {
      brandMemories.push({
        memory_type: 'brand_context',
        key: 'target_audience',
        value: brandProfile.target_audience,
        confidence_score: 1.0
      });
    }

    if (brandProfile.primary_color || brandProfile.secondary_color) {
      brandMemories.push({
        memory_type: 'brand_context',
        key: 'brand_colors',
        value: {
          primary: brandProfile.primary_color,
          secondary: brandProfile.secondary_color,
          accent: brandProfile.accent_color
        },
        confidence_score: 1.0
      });
    }

    // Store all brand memories
    for (const memory of brandMemories) {
      await upsertMemory(supabase, userId, memory);
    }

    console.log('[Memory] Initialized brand memory with', brandMemories.length, 'entries');
  } catch (error) {
    console.error('[Memory] Failed to initialize brand memory:', error);
  }
}
