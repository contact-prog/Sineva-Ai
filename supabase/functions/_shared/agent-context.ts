// Agent Context Management
// Enables agents to share context and results across workflow steps

export interface BrandKitContext {
  companyName?: string;
  brandVoice?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  targetAudience?: string;
  industry?: string;
  tagline?: string;
}

export interface ResearchInsights {
  topic: string;
  keyPoints: string[];
  competitors?: string[];
  recommendations: string[];
  targetAudience?: string;
  bestPractices?: string[];
  contentStrategy?: string;
}

export interface GeneratedAsset {
  id: string;
  url: string;
  type: 'graphic' | 'video' | 'content' | 'email';
  metadata?: Record<string, any>;
}

export interface WorkflowStepResult {
  stepNumber: number;
  agent: string;
  action: string;
  result: any;
  timestamp: string;
}

export interface AgentContext {
  workflowId: string;
  userId: string;
  conversationId?: string;
  
  // Brand information
  brandKit: BrandKitContext;
  
  // Research phase results
  researchInsights?: ResearchInsights;
  
  // Generated assets from previous steps
  generatedAssets: {
    graphics?: GeneratedAsset[];
    videos?: GeneratedAsset[];
    content?: GeneratedAsset[];
    emails?: GeneratedAsset[];
  };
  
  // Complete history of previous steps
  previousSteps: WorkflowStepResult[];
  
  // Original user request
  originalPrompt: string;
  
  // Workflow metadata
  workflowGoal: string;
  currentStep: number;
  totalSteps: number;
}

/**
 * Create initial agent context from user profile and workflow info
 */
export function createAgentContext(
  workflowId: string,
  userId: string,
  userProfile: any,
  originalPrompt: string,
  workflowGoal: string,
  totalSteps: number
): AgentContext {
  return {
    workflowId,
    userId,
    brandKit: {
      companyName: userProfile?.company_name,
      brandVoice: userProfile?.brand_voice,
      logoUrl: userProfile?.logo_url,
      primaryColor: userProfile?.primary_color,
      secondaryColor: userProfile?.secondary_color,
      accentColor: userProfile?.accent_color,
      targetAudience: userProfile?.target_audience,
      industry: userProfile?.industry,
      tagline: userProfile?.tagline
    },
    generatedAssets: {},
    previousSteps: [],
    originalPrompt,
    workflowGoal,
    currentStep: 1,
    totalSteps
  };
}

/**
 * Update context after a workflow step completes
 */
export function updateContextAfterStep(
  context: AgentContext,
  stepNumber: number,
  agent: string,
  action: string,
  result: any
): AgentContext {
  const updatedContext = { ...context };
  
  // Add step result to history
  updatedContext.previousSteps.push({
    stepNumber,
    agent,
    action,
    result,
    timestamp: new Date().toISOString()
  });
  
  // Update current step
  updatedContext.currentStep = stepNumber + 1;
  
  // Store generated assets by type
  if (agent === 'research' && result.insights) {
    updatedContext.researchInsights = result.insights;
  }
  
  if (agent === 'graphics' && result.id) {
    if (!updatedContext.generatedAssets.graphics) {
      updatedContext.generatedAssets.graphics = [];
    }
    updatedContext.generatedAssets.graphics.push({
      id: result.id,
      url: result.url || result.image_url,
      type: 'graphic',
      metadata: result
    });
  }
  
  if (agent === 'video' && result.id) {
    if (!updatedContext.generatedAssets.videos) {
      updatedContext.generatedAssets.videos = [];
    }
    updatedContext.generatedAssets.videos.push({
      id: result.id,
      url: result.video_url,
      type: 'video',
      metadata: result
    });
  }
  
  if (agent === 'content' && result.content) {
    if (!updatedContext.generatedAssets.content) {
      updatedContext.generatedAssets.content = [];
    }
    updatedContext.generatedAssets.content.push({
      id: result.id || `content-${Date.now()}`,
      url: '',
      type: 'content',
      metadata: result
    });
  }
  
  return updatedContext;
}

/**
 * Get context summary for AI to understand workflow state
 */
export function getContextSummary(context: AgentContext): string {
  const parts: string[] = [];
  
  parts.push(`Workflow Goal: ${context.workflowGoal}`);
  parts.push(`Progress: Step ${context.currentStep} of ${context.totalSteps}`);
  
  if (context.brandKit.companyName) {
    parts.push(`Company: ${context.brandKit.companyName}`);
  }
  
  if (context.researchInsights) {
    parts.push(`Research completed on: ${context.researchInsights.topic}`);
    parts.push(`Key findings: ${context.researchInsights.keyPoints.slice(0, 3).join(', ')}`);
  }
  
  if (context.generatedAssets.graphics?.length) {
    parts.push(`Generated ${context.generatedAssets.graphics.length} graphic(s)`);
  }
  
  if (context.generatedAssets.videos?.length) {
    parts.push(`Generated ${context.generatedAssets.videos.length} video(s)`);
  }
  
  if (context.generatedAssets.content?.length) {
    parts.push(`Generated ${context.generatedAssets.content.length} content piece(s)`);
  }
  
  return parts.join('\n');
}

/**
 * Extract relevant context for a specific agent
 */
export function getAgentSpecificContext(context: AgentContext, agent: string): any {
  const base = {
    brandKit: context.brandKit,
    workflowGoal: context.workflowGoal,
    originalPrompt: context.originalPrompt
  };
  
  // Graphics agent needs research insights and brand kit
  if (agent === 'graphics') {
    return {
      ...base,
      researchInsights: context.researchInsights,
      previousGraphics: context.generatedAssets.graphics || []
    };
  }
  
  // Content agent needs research insights and generated graphics
  if (agent === 'content') {
    return {
      ...base,
      researchInsights: context.researchInsights,
      graphics: context.generatedAssets.graphics || [],
      videos: context.generatedAssets.videos || []
    };
  }
  
  // Social agent needs all generated content
  if (agent === 'social') {
    return {
      ...base,
      graphics: context.generatedAssets.graphics || [],
      videos: context.generatedAssets.videos || [],
      content: context.generatedAssets.content || []
    };
  }
  
  // Email agent needs content and brand kit
  if (agent === 'email') {
    return {
      ...base,
      content: context.generatedAssets.content || [],
      graphics: context.generatedAssets.graphics || []
    };
  }
  
  // Video agent needs research and brand kit
  if (agent === 'video') {
    return {
      ...base,
      researchInsights: context.researchInsights
    };
  }
  
  return base;
}
