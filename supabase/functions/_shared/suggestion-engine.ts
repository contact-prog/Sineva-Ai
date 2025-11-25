/**
 * Proactive Suggestion Engine - Phase 1.2: Enhanced Intelligence
 * Analyzes completed actions, user patterns, and conversation context
 * to provide intelligent predictive suggestions and goal detection
 */

interface ToolResult {
  name: string;
  response?: any;
  error?: string;
}

interface MemoryContext {
  preferences?: Record<string, any>;
  patterns?: Record<string, any>;
  successful_workflows?: any[];
  brand_context?: Record<string, any>;
}

interface Suggestion {
  id: string;
  title: string;
  description: string;
  action: string;
  params?: Record<string, any>;
  confidence: number;
  reasoning?: string;
  priority?: 'high' | 'medium' | 'low';
}

interface ConversationContext {
  recentMessages: Array<{ role: string; content: string }>;
  recentTools: string[];
  conversationGoal?: string;
  detectedIntent?: string;
}

interface UserGoal {
  type: 'content_creation' | 'campaign_launch' | 'research' | 'optimization' | 'engagement' | 'unknown';
  confidence: number;
  suggestedPath: string[];
  reasoning: string;
}

/**
 * Analyze completed tool and suggest next steps based on patterns
 */
export function generateProactiveSuggestions(
  completedTool: ToolResult,
  memoryContext: MemoryContext,
  userContext?: {
    recentTools?: string[];
    conversationGoal?: string;
  }
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const toolName = completedTool.name;

  // Check memory for common patterns
  const patterns = memoryContext.patterns || {};
  const successfulWorkflows = memoryContext.successful_workflows || [];

  // GRAPHICS → SOCIAL POST
  if (toolName === 'generate_graphic' && completedTool.response?.imageUrl) {
    const graphicId = completedTool.response.id;
    const imageUrl = completedTool.response.imageUrl;

    // Check if user often posts after creating graphics
    const postsAfterGraphics = patterns['posts_after_graphics'];
    const confidence = postsAfterGraphics ? 0.9 : 0.7;

    suggestions.push({
      id: 'post_graphic',
      title: '📱 Post to social media',
      description: 'Share this graphic on your connected platforms',
      action: 'publish_social_post',
      params: {
        mediaUrl: imageUrl,
        prompt: 'Write a caption for this graphic and publish it'
      },
      confidence,
      reasoning: postsAfterGraphics 
        ? 'You usually post graphics after creating them'
        : 'Great graphics deserve to be shared'
    });

    suggestions.push({
      id: 'schedule_graphic',
      title: '📅 Schedule for later',
      description: 'Plan when to post this graphic',
      action: 'schedule_content',
      params: {
        contentId: graphicId,
        mediaUrl: imageUrl
      },
      confidence: 0.8,
      reasoning: 'Strategic timing improves engagement'
    });

    suggestions.push({
      id: 'create_variations',
      title: '🎨 Create variations',
      description: 'Generate different versions for A/B testing',
      action: 'generate_graphic',
      params: {
        referenceImageUrl: imageUrl,
        prompt: 'Create 2 variations of this design'
      },
      confidence: 0.6
    });
  }

  // VIDEO → PUBLISH/SCHEDULE
  if (toolName === 'generate_video' && completedTool.response?.videoUrl) {
    const videoUrl = completedTool.response.videoUrl;

    suggestions.push({
      id: 'post_video',
      title: '🎬 Post video now',
      description: 'Share this video on social platforms',
      action: 'publish_social_post',
      params: {
        mediaUrl: videoUrl,
        prompt: 'Write a caption and post this video'
      },
      confidence: 0.85
    });

    suggestions.push({
      id: 'schedule_video',
      title: '⏰ Schedule video',
      description: 'Plan optimal posting time',
      action: 'schedule_content',
      params: {
        mediaUrl: videoUrl
      },
      confidence: 0.8
    });

    // Check if user creates emails with videos
    if (patterns['emails_with_videos']) {
      suggestions.push({
        id: 'email_video',
        title: '📧 Send in email',
        description: 'Include in email campaign',
        action: 'generate_email',
        params: {
          videoUrl: videoUrl,
          prompt: 'Create email campaign featuring this video'
        },
        confidence: 0.75,
        reasoning: 'You often include videos in emails'
      });
    }
  }

  // CONTENT → GRAPHICS + PUBLISH
  if (toolName === 'generate_content' && completedTool.response?.content) {
    const content = completedTool.response.content;
    const contentType = completedTool.response.contentType || 'social_post';

    if (contentType.includes('social') || contentType.includes('caption')) {
      suggestions.push({
        id: 'create_graphic_for_content',
        title: '🖼️ Create matching graphic',
        description: 'Generate visual to accompany this content',
        action: 'generate_graphic',
        params: {
          prompt: `Create a graphic for this content: ${content.substring(0, 200)}...`
        },
        confidence: 0.8,
        reasoning: 'Visual content performs better'
      });

      suggestions.push({
        id: 'publish_content',
        title: '🚀 Publish now',
        description: 'Post this content to your platforms',
        action: 'publish_social_post',
        params: {
          content: content
        },
        confidence: 0.75
      });
    }

    if (contentType.includes('blog')) {
      suggestions.push({
        id: 'create_blog_graphics',
        title: '📸 Create blog images',
        description: 'Generate featured image and graphics',
        action: 'generate_graphic',
        params: {
          prompt: `Create featured image for blog post about: ${content.substring(0, 150)}`
        },
        confidence: 0.85
      });

      suggestions.push({
        id: 'publish_to_wordpress',
        title: '📝 Publish to WordPress',
        description: 'Push this blog post to your site',
        action: 'publish_to_wordpress',
        params: {
          content: content
        },
        confidence: 0.8
      });
    }
  }

  // RESEARCH → CONTENT CREATION
  if (toolName === 'research_topic' && completedTool.response?.insights) {
    suggestions.push({
      id: 'create_post_from_research',
      title: '✍️ Create social post',
      description: 'Turn research into engaging content',
      action: 'generate_content',
      params: {
        prompt: 'Create a social media post based on this research'
      },
      confidence: 0.9,
      reasoning: 'Research is most valuable when shared'
    });

    suggestions.push({
      id: 'create_blog_from_research',
      title: '📄 Write blog post',
      description: 'Expand research into detailed article',
      action: 'generate_content',
      params: {
        contentType: 'blog_post',
        prompt: 'Write comprehensive blog post from this research'
      },
      confidence: 0.85
    });

    suggestions.push({
      id: 'create_infographic',
      title: '📊 Create infographic',
      description: 'Visualize research findings',
      action: 'generate_graphic',
      params: {
        prompt: 'Create infographic visualizing these research insights'
      },
      confidence: 0.75
    });
  }

  // WORKFLOW COMPLETION → NEXT CAMPAIGN
  if (successfulWorkflows.length > 0) {
    const lastWorkflow = successfulWorkflows[0];
    
    // Suggest similar workflow
    if (lastWorkflow.type === 'content_campaign') {
      suggestions.push({
        id: 'repeat_workflow',
        title: '🔄 Repeat successful campaign',
        description: 'Run similar workflow that worked well',
        action: 'create_workflow_plan',
        confidence: 0.7,
        reasoning: 'This workflow pattern was successful before'
      });
    }
  }

  // Sort by confidence and return top 3
  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}

/**
 * Check if current context suggests a multi-step workflow
 */
export function detectWorkflowOpportunity(
  recentTools: string[],
  memoryContext: MemoryContext
): Suggestion | null {
  // If user just created content + graphic, suggest publishing both
  const hasContent = recentTools.some(t => t.includes('content'));
  const hasGraphic = recentTools.some(t => t.includes('graphic'));
  
  if (hasContent && hasGraphic) {
    return {
      id: 'publish_campaign',
      title: '🎯 Launch complete campaign',
      description: 'Publish your content and graphic together',
      action: 'create_workflow_plan',
      params: {
        userGoal: 'Publish the content and graphic I just created',
        steps: [
          {
            agent: 'social',
            action: 'publish_social_post',
            purpose: 'Post content with graphic to social platforms'
          }
        ]
      },
      confidence: 0.9,
      reasoning: 'You created both content and visuals - ready to launch!'
    };
  }

  return null;
}

/**
 * Generate time-based suggestions
 */
export function generateTimingBasedSuggestions(
  memoryContext: MemoryContext,
  currentHour: number
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const patterns = memoryContext.patterns || {};

  // Morning content creation reminder
  if (currentHour >= 8 && currentHour <= 10) {
    const morningCreator = patterns['creates_morning_content'];
    if (morningCreator) {
      suggestions.push({
        id: 'morning_content',
        title: '☀️ Create today\'s content',
        description: 'You usually create content in the morning',
        action: 'generate_content',
        confidence: 0.75,
        reasoning: 'Morning is your creative time'
      });
    }
  }

  // Afternoon posting reminder
  if (currentHour >= 14 && currentHour <= 16) {
    const afternoonPoster = patterns['posts_afternoon'];
    if (afternoonPoster) {
      suggestions.push({
        id: 'afternoon_post',
        title: '📱 Schedule afternoon posts',
        description: 'Best engagement time for your audience',
        action: 'suggest_best_times',
        confidence: 0.8,
        reasoning: 'Your posts perform well at this time'
      });
    }
  }

  return suggestions;
}

/**
 * PHASE 1.2: GOAL DETECTION
 * Analyze conversation context to detect user's goal
 */
export function detectUserGoal(
  conversationContext: ConversationContext,
  memoryContext: MemoryContext
): UserGoal {
  const messages = conversationContext.recentMessages || [];
  const recentTools = conversationContext.recentTools || [];
  
  // Combine recent messages for analysis
  const conversationText = messages
    .slice(-5) // Last 5 messages
    .map(m => m.content)
    .join(' ')
    .toLowerCase();

  // Pattern matching for goal detection
  const goalPatterns = {
    content_creation: [
      'create', 'write', 'generate', 'make', 'design', 'produce',
      'content', 'post', 'caption', 'article', 'blog', 'graphic', 'video'
    ],
    campaign_launch: [
      'launch', 'campaign', 'promote', 'publish', 'schedule', 'post to',
      'multi-platform', 'cross-platform', 'all platforms', 'everywhere'
    ],
    research: [
      'research', 'analyze', 'find', 'look up', 'investigate', 'study',
      'trends', 'competitors', 'audience', 'keywords', 'insights'
    ],
    optimization: [
      'improve', 'optimize', 'enhance', 'better', 'increase', 'boost',
      'performance', 'engagement', 'reach', 'conversion', 'seo'
    ],
    engagement: [
      'engage', 'respond', 'reply', 'interact', 'community', 'audience',
      'comments', 'messages', 'feedback', 'conversation'
    ]
  };

  // Score each goal type
  const scores: Record<string, number> = {
    content_creation: 0,
    campaign_launch: 0,
    research: 0,
    optimization: 0,
    engagement: 0
  };

  // Pattern matching
  Object.entries(goalPatterns).forEach(([goal, keywords]) => {
    keywords.forEach(keyword => {
      if (conversationText.includes(keyword)) {
        scores[goal] += 1;
      }
    });
  });

  // Tool-based scoring
  if (recentTools.some(t => t.includes('generate'))) {
    scores.content_creation += 3;
  }
  if (recentTools.some(t => t.includes('publish') || t.includes('schedule'))) {
    scores.campaign_launch += 3;
  }
  if (recentTools.some(t => t.includes('research') || t.includes('analyze'))) {
    scores.research += 3;
  }
  if (recentTools.some(t => t.includes('optimize') || t.includes('enhance'))) {
    scores.optimization += 3;
  }

  // Memory-based scoring (user patterns)
  const patterns = memoryContext.patterns || {};
  if (patterns.frequent_content_creator) {
    scores.content_creation += 2;
  }
  if (patterns.campaign_runner) {
    scores.campaign_launch += 2;
  }

  // Find highest score
  const maxScore = Math.max(...Object.values(scores));
  const detectedGoalType = (Object.keys(scores).find(
    key => scores[key] === maxScore
  ) as UserGoal['type']) || 'unknown';

  const confidence = maxScore > 0 ? Math.min(maxScore / 10, 1.0) : 0.3;

  // Define suggested paths for each goal
  const pathSuggestions: Record<string, string[]> = {
    content_creation: [
      'Generate content/graphics',
      'Review and refine',
      'Publish or schedule',
      'Monitor performance'
    ],
    campaign_launch: [
      'Create campaign assets',
      'Set up multi-platform posts',
      'Schedule optimal times',
      'Track engagement'
    ],
    research: [
      'Research topic/competitors',
      'Analyze findings',
      'Create content from insights',
      'Share with audience'
    ],
    optimization: [
      'Analyze current performance',
      'Identify improvements',
      'Implement changes',
      'Measure results'
    ],
    engagement: [
      'Review comments/messages',
      'Generate responses',
      'Schedule engagement time',
      'Build community'
    ],
    unknown: [
      'Clarify your goal',
      'Explore available tools',
      'Start with content creation'
    ]
  };

  return {
    type: detectedGoalType,
    confidence,
    suggestedPath: pathSuggestions[detectedGoalType],
    reasoning: `Detected goal based on keywords and recent actions (confidence: ${(confidence * 100).toFixed(0)}%)`
  };
}

/**
 * PHASE 1.2: SMART DEFAULTS
 * Apply intelligent defaults based on user patterns
 */
export function applySmartDefaults(
  params: Record<string, any>,
  service: string,
  memoryContext: MemoryContext
): Record<string, any> {
  const preferences = memoryContext.preferences || {};
  const patterns = memoryContext.patterns || {};
  const enhancedParams = { ...params };

  // Apply tone preferences if not specified
  if (!enhancedParams.tone && preferences[`${service}_preferred_tone`]) {
    enhancedParams.tone = preferences[`${service}_preferred_tone`].tone;
  }

  // Apply platform preferences
  if (!enhancedParams.platforms && preferences[`${service}_preferred_platforms`]) {
    enhancedParams.platforms = preferences[`${service}_preferred_platforms`].platforms;
  }

  // Apply content type preferences
  if (!enhancedParams.contentType && preferences[`${service}_preferred_content_type`]) {
    enhancedParams.contentType = preferences[`${service}_preferred_content_type`].contentType;
  }

  // Apply style preferences for graphics
  if (service === 'graphics' && !enhancedParams.style) {
    if (patterns.successful_graphic_styles) {
      const styles = patterns.successful_graphic_styles.value?.styles || [];
      if (styles.length > 0) {
        enhancedParams.style = styles[0]; // Use most successful style
      }
    }
  }

  // Apply time preferences for scheduling
  if (service === 'scheduling' && !enhancedParams.scheduledTime) {
    if (patterns.best_posting_times) {
      const times = patterns.best_posting_times.value?.times || [];
      if (times.length > 0) {
        enhancedParams.suggestedTime = times[0];
      }
    }
  }

  return enhancedParams;
}

/**
 * PHASE 1.2: PREDICTIVE SUGGESTIONS
 * Generate context-aware suggestions based on conversation flow
 */
export function generatePredictiveSuggestions(
  conversationContext: ConversationContext,
  memoryContext: MemoryContext,
  userGoal?: UserGoal
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const recentTools = conversationContext.recentTools || [];
  const goal = userGoal || detectUserGoal(conversationContext, memoryContext);

  // If goal confidence is high, suggest next steps in the path
  if (goal.confidence > 0.6) {
    const currentStep = recentTools.length > 0 ? 1 : 0;
    const nextStep = goal.suggestedPath[currentStep];

    if (nextStep) {
      suggestions.push({
        id: 'goal_next_step',
        title: `📋 ${nextStep}`,
        description: `Continue your ${goal.type.replace('_', ' ')} workflow`,
        action: 'continue_workflow',
        confidence: goal.confidence,
        priority: 'high',
        reasoning: goal.reasoning
      });
    }
  }

  // Suggest completing incomplete workflows
  const hasContentNoGraphic = recentTools.some(t => t.includes('content')) && 
    !recentTools.some(t => t.includes('graphic'));
  
  if (hasContentNoGraphic) {
    suggestions.push({
      id: 'complete_with_graphic',
      title: '🎨 Add matching visual',
      description: 'Create a graphic to complement your content',
      action: 'generate_graphic',
      confidence: 0.85,
      priority: 'high',
      reasoning: 'Visual content increases engagement by 650%'
    });
  }

  const hasGraphicNoPublish = recentTools.some(t => t.includes('graphic')) && 
    !recentTools.some(t => t.includes('publish') || t.includes('schedule'));

  if (hasGraphicNoPublish) {
    suggestions.push({
      id: 'publish_graphic',
      title: '🚀 Share your graphic',
      description: 'Publish to your connected platforms',
      action: 'publish_social_post',
      confidence: 0.9,
      priority: 'high',
      reasoning: 'Your graphic is ready to share'
    });
  }

  // Suggest based on time patterns
  const patterns = memoryContext.patterns || {};
  const currentHour = new Date().getHours();

  if (currentHour >= 14 && currentHour <= 16 && patterns.posts_afternoon) {
    suggestions.push({
      id: 'optimal_time_suggestion',
      title: '⏰ Post now for best reach',
      description: 'Your audience is most active right now',
      action: 'publish_now',
      confidence: 0.8,
      priority: 'medium',
      reasoning: 'Based on your historical engagement data'
    });
  }

  // Sort by priority and confidence
  return suggestions.sort((a, b) => {
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    const aPriority = priorityWeight[a.priority || 'low'];
    const bPriority = priorityWeight[b.priority || 'low'];
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }
    return b.confidence - a.confidence;
  }).slice(0, 4);
}

/**
 * Format suggestions for display in chat
 */
export function formatSuggestionsForChat(suggestions: Suggestion[]): string {
  if (suggestions.length === 0) return '';

  let message = '\n\n**💡 What would you like to do next?**\n\n';
  
  suggestions.forEach((suggestion, index) => {
    message += `${index + 1}. **${suggestion.title}** - ${suggestion.description}`;
    if (suggestion.reasoning) {
      message += ` *(${suggestion.reasoning})*`;
    }
    message += '\n';
  });

  return message;
}
