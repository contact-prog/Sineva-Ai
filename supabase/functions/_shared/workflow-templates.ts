// Workflow Templates
// Pre-built workflow patterns for common use cases

import type { WorkflowPlan, WorkflowStep } from './workflow-planner.ts';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'content' | 'marketing' | 'social' | 'research' | 'automation';
  tags: string[];
  buildPlan: (userInput: Record<string, any>) => WorkflowPlan;
}

/**
 * Template: Content Creation → Social Distribution
 */
export const contentToSocialTemplate: WorkflowTemplate = {
  id: 'content-to-social',
  name: 'Content Creation → Social Distribution',
  description: 'Generate content and automatically post to multiple social platforms',
  category: 'marketing',
  tags: ['content', 'social', 'automation'],
  buildPlan: (userInput: Record<string, any>): WorkflowPlan => ({
    id: crypto.randomUUID(),
    originalPrompt: userInput.prompt || 'Create and distribute content',
    goal: 'Create content and share across social platforms',
    researchRequired: false,
    complexity: 'moderate',
    estimatedDuration: 45,
    steps: [
      {
        stepNumber: 1,
        agent: 'content',
        action: 'generate_content',
        purpose: 'Generate engaging content based on topic',
        parameters: {
          topic: userInput.topic,
          contentType: userInput.contentType || 'social_post',
          tone: userInput.tone || 'professional'
        },
        canRunInParallel: false
      },
      {
        stepNumber: 2,
        agent: 'social',
        action: 'optimize_social_content',
        purpose: 'Optimize content for each platform',
        parameters: {
          platforms: userInput.platforms || ['twitter', 'linkedin', 'facebook']
        },
        dependsOn: [1],
        inputMapping: { content: 'step1.generatedText' },
        canRunInParallel: false
      },
      {
        stepNumber: 3,
        agent: 'social',
        action: 'schedule_social_post',
        purpose: 'Schedule posts to all platforms',
        parameters: {
          scheduleTime: userInput.scheduleTime || 'optimal'
        },
        dependsOn: [2],
        inputMapping: { 
          content: 'step2.optimizedContent',
          platforms: 'step2.platforms'
        },
        canRunInParallel: false
      }
    ]
  })
};

/**
 * Template: Visual Content Campaign
 */
export const visualCampaignTemplate: WorkflowTemplate = {
  id: 'visual-campaign',
  name: 'Visual Content Campaign',
  description: 'Create graphics and video content for a complete campaign',
  category: 'content',
  tags: ['graphics', 'video', 'campaign'],
  buildPlan: (userInput: Record<string, any>): WorkflowPlan => ({
    id: crypto.randomUUID(),
    originalPrompt: userInput.prompt || 'Create visual campaign',
    goal: 'Generate complete visual content campaign',
    researchRequired: false,
    complexity: 'complex',
    estimatedDuration: 120,
    steps: [
      {
        stepNumber: 1,
        agent: 'graphics',
        action: 'generate_platform_suite',
        purpose: 'Generate graphics for all platforms',
        parameters: {
          prompt: userInput.prompt,
          platforms: userInput.platforms || ['instagram', 'facebook', 'twitter']
        },
        canRunInParallel: false
      },
      {
        stepNumber: 2,
        agent: 'video',
        action: 'generate_automated_video_story',
        purpose: 'Create promotional video',
        parameters: {
          storyTopic: userInput.topic,
          duration: userInput.videoDuration || 30
        },
        canRunInParallel: true
      },
      {
        stepNumber: 3,
        agent: 'content',
        action: 'generate_content',
        purpose: 'Write campaign copy',
        parameters: {
          topic: userInput.topic,
          contentType: 'campaign_copy',
          tone: userInput.tone || 'engaging'
        },
        canRunInParallel: true
      }
    ]
  })
};

/**
 * Template: Research → Strategy → Content
 */
export const researchToContentTemplate: WorkflowTemplate = {
  id: 'research-to-content',
  name: 'Research → Strategy → Content',
  description: 'Research topic, develop strategy, then create optimized content',
  category: 'research',
  tags: ['research', 'strategy', 'content', 'seo'],
  buildPlan: (userInput: Record<string, any>): WorkflowPlan => ({
    id: crypto.randomUUID(),
    originalPrompt: userInput.prompt || 'Research and create content',
    goal: 'Research-driven content creation',
    researchRequired: true,
    complexity: 'complex',
    estimatedDuration: 90,
    steps: [
      {
        stepNumber: 1,
        agent: 'research',
        action: 'web_research',
        purpose: 'Research topic and gather insights',
        parameters: {
          topic: userInput.topic,
          depth: 'comprehensive'
        },
        canRunInParallel: false
      },
      {
        stepNumber: 2,
        agent: 'content',
        action: 'generate_content',
        purpose: 'Create SEO-optimized content',
        parameters: {
          topic: userInput.topic,
          contentType: userInput.contentType || 'blog',
          seoOptimized: true
        },
        dependsOn: [1],
        inputMapping: { researchInsights: 'step1.insights' },
        canRunInParallel: false
      },
      {
        stepNumber: 3,
        agent: 'content',
        action: 'analyze_seo',
        purpose: 'Analyze and optimize SEO',
        parameters: {},
        dependsOn: [2],
        inputMapping: { content: 'step2.generatedText' },
        canRunInParallel: false
      }
    ]
  })
};

/**
 * Template: Email Campaign Setup
 */
export const emailCampaignTemplate: WorkflowTemplate = {
  id: 'email-campaign',
  name: 'Email Campaign Setup',
  description: 'Create email content and schedule delivery',
  category: 'marketing',
  tags: ['email', 'campaign', 'automation'],
  buildPlan: (userInput: Record<string, any>): WorkflowPlan => ({
    id: crypto.randomUUID(),
    originalPrompt: userInput.prompt || 'Create email campaign',
    goal: 'Set up automated email campaign',
    researchRequired: false,
    complexity: 'moderate',
    estimatedDuration: 30,
    steps: [
      {
        stepNumber: 1,
        agent: 'email',
        action: 'generate_email_content',
        purpose: 'Generate email content',
        parameters: {
          topic: userInput.topic,
          emailType: userInput.emailType || 'promotional',
          tone: userInput.tone || 'professional'
        },
        canRunInParallel: false
      },
      {
        stepNumber: 2,
        agent: 'email',
        action: 'schedule_email',
        purpose: 'Schedule email delivery',
        parameters: {
          recipients: userInput.recipients,
          scheduleTime: userInput.scheduleTime
        },
        dependsOn: [1],
        inputMapping: { 
          subject: 'step1.subject',
          body: 'step1.body'
        },
        canRunInParallel: false
      }
    ]
  })
};

/**
 * Template: Full Marketing Stack
 */
export const fullMarketingTemplate: WorkflowTemplate = {
  id: 'full-marketing-stack',
  name: 'Full Marketing Stack',
  description: 'Complete marketing workflow: graphics, video, content, social, email',
  category: 'marketing',
  tags: ['comprehensive', 'marketing', 'automation', 'campaign'],
  buildPlan: (userInput: Record<string, any>): WorkflowPlan => ({
    id: crypto.randomUUID(),
    originalPrompt: userInput.prompt || 'Full marketing campaign',
    goal: 'Execute comprehensive marketing campaign',
    researchRequired: true,
    complexity: 'complex',
    estimatedDuration: 180,
    steps: [
      {
        stepNumber: 1,
        agent: 'research',
        action: 'web_research',
        purpose: 'Market research and trend analysis',
        parameters: {
          topic: userInput.topic,
          depth: 'comprehensive'
        },
        canRunInParallel: false
      },
      {
        stepNumber: 2,
        agent: 'graphics',
        action: 'generate_platform_suite',
        purpose: 'Create visual assets',
        parameters: {
          prompt: userInput.visualPrompt,
          platforms: ['instagram', 'facebook', 'twitter', 'linkedin']
        },
        dependsOn: [1],
        canRunInParallel: true
      },
      {
        stepNumber: 3,
        agent: 'video',
        action: 'generate_automated_video_story',
        purpose: 'Create promotional video',
        parameters: {
          storyTopic: userInput.topic,
          duration: 30
        },
        dependsOn: [1],
        canRunInParallel: true
      },
      {
        stepNumber: 4,
        agent: 'content',
        action: 'generate_content',
        purpose: 'Write blog post',
        parameters: {
          topic: userInput.topic,
          contentType: 'blog',
          seoOptimized: true
        },
        dependsOn: [1],
        inputMapping: { researchInsights: 'step1.insights' },
        canRunInParallel: true
      },
      {
        stepNumber: 5,
        agent: 'social',
        action: 'generate_platform_suite',
        purpose: 'Create social media posts',
        parameters: {
          platforms: ['twitter', 'linkedin', 'facebook', 'instagram']
        },
        dependsOn: [2, 3, 4],
        canRunInParallel: false
      },
      {
        stepNumber: 6,
        agent: 'email',
        action: 'generate_email_content',
        purpose: 'Create email newsletter',
        parameters: {
          topic: userInput.topic,
          emailType: 'newsletter'
        },
        dependsOn: [4],
        inputMapping: { blogContent: 'step4.generatedText' },
        canRunInParallel: true
      }
    ]
  })
};

/**
 * All available templates
 */
export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  contentToSocialTemplate,
  visualCampaignTemplate,
  researchToContentTemplate,
  emailCampaignTemplate,
  fullMarketingTemplate
];

/**
 * Find templates that match user intent
 */
export function findMatchingTemplates(
  message: string,
  maxResults: number = 3
): WorkflowTemplate[] {
  const messageLower = message.toLowerCase();
  const scores: Array<{ template: WorkflowTemplate; score: number }> = [];
  
  for (const template of WORKFLOW_TEMPLATES) {
    let score = 0;
    
    // Check name match
    if (messageLower.includes(template.name.toLowerCase())) {
      score += 10;
    }
    
    // Check tag matches
    for (const tag of template.tags) {
      if (messageLower.includes(tag)) {
        score += 3;
      }
    }
    
    // Check category match
    if (messageLower.includes(template.category)) {
      score += 5;
    }
    
    // Check description keywords
    const descWords = template.description.toLowerCase().split(' ');
    for (const word of descWords) {
      if (word.length > 4 && messageLower.includes(word)) {
        score += 1;
      }
    }
    
    if (score > 0) {
      scores.push({ template, score });
    }
  }
  
  // Sort by score and return top matches
  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(s => s.template);
}

/**
 * Suggest templates based on detected services
 */
export function suggestTemplatesForServices(
  services: string[]
): WorkflowTemplate[] {
  const suggestions: WorkflowTemplate[] = [];
  
  // Match templates to detected services
  for (const template of WORKFLOW_TEMPLATES) {
    const templateServices = new Set(template.tags);
    const matchCount = services.filter(s => 
      templateServices.has(s.toLowerCase())
    ).length;
    
    if (matchCount >= 2) {
      suggestions.push(template);
    }
  }
  
  return suggestions;
}
