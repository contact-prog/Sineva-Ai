/**
 * Content Templates & Copywriting Frameworks
 * Professional frameworks to structure content generation
 */

export interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  framework: string;
  structure: string[];
  bestFor: string[];
  example: string;
}

export const contentTemplates: ContentTemplate[] = [
  {
    id: 'aida',
    name: 'AIDA Framework',
    description: 'Attention, Interest, Desire, Action',
    framework: 'aida',
    structure: [
      'Attention: Start with a compelling hook',
      'Interest: Build curiosity with engaging information',
      'Desire: Show benefits and create emotional connection',
      'Action: Clear call-to-action'
    ],
    bestFor: ['sales', 'marketing', 'email', 'ads'],
    example: 'Perfect for promotional content and sales-focused messaging'
  },
  {
    id: 'pas',
    name: 'PAS Framework',
    description: 'Problem, Agitate, Solution',
    framework: 'pas',
    structure: [
      'Problem: Identify the pain point',
      'Agitate: Amplify the problem\'s impact',
      'Solution: Present your offer as the answer'
    ],
    bestFor: ['problem-solving', 'sales', 'blog', 'email'],
    example: 'Great for addressing customer pain points and positioning solutions'
  },
  {
    id: 'fab',
    name: 'FAB Framework',
    description: 'Features, Advantages, Benefits',
    framework: 'fab',
    structure: [
      'Features: List product/service features',
      'Advantages: Explain how features work',
      'Benefits: Show real-world value to customer'
    ],
    bestFor: ['product descriptions', 'technical content', 'landing pages'],
    example: 'Ideal for product showcases and technical explanations'
  },
  {
    id: 'before-after-bridge',
    name: 'Before-After-Bridge',
    description: 'Transform the current state to desired outcome',
    framework: 'before-after-bridge',
    structure: [
      'Before: Current problematic situation',
      'After: Ideal future state',
      'Bridge: How to get from before to after'
    ],
    bestFor: ['transformation stories', 'case studies', 'testimonials'],
    example: 'Perfect for showcasing transformations and success stories'
  },
  {
    id: '4cs',
    name: '4 C\'s Framework',
    description: 'Clear, Concise, Compelling, Credible',
    framework: '4cs',
    structure: [
      'Clear: Easy to understand message',
      'Concise: No unnecessary words',
      'Compelling: Engaging and interesting',
      'Credible: Trustworthy and backed by facts'
    ],
    bestFor: ['professional content', 'business communication', 'reports'],
    example: 'Best for professional and business-focused content'
  },
  {
    id: 'storytelling',
    name: 'Storytelling Framework',
    description: 'Classic narrative structure',
    framework: 'storytelling',
    structure: [
      'Setup: Introduce characters and context',
      'Conflict: Present the challenge',
      'Resolution: Show how it was overcome',
      'Lesson: Key takeaway'
    ],
    bestFor: ['brand stories', 'case studies', 'blog posts', 'social media'],
    example: 'Engaging narrative structure for emotional connection'
  },
  {
    id: 'scqa',
    name: 'SCQA Framework',
    description: 'Situation, Complication, Question, Answer',
    framework: 'scqa',
    structure: [
      'Situation: Set the context',
      'Complication: Introduce the problem',
      'Question: Pose the key question',
      'Answer: Provide the solution'
    ],
    bestFor: ['analytical content', 'consulting', 'strategy', 'reports'],
    example: 'Professional framework for structured problem-solving content'
  },
  {
    id: 'hook-story-offer',
    name: 'Hook-Story-Offer',
    description: 'Capture attention, build connection, present offer',
    framework: 'hook-story-offer',
    structure: [
      'Hook: Grab attention immediately',
      'Story: Share relatable narrative',
      'Offer: Present clear value proposition'
    ],
    bestFor: ['social media', 'ads', 'email', 'video scripts'],
    example: 'High-conversion framework for marketing content'
  },
  {
    id: 'none',
    name: 'Free-Form',
    description: 'No specific framework, AI decides structure',
    framework: 'none',
    structure: ['Natural flow based on content type and topic'],
    bestFor: ['flexible', 'creative', 'mixed content'],
    example: 'Let AI decide the best structure for your content'
  }
];

/**
 * Get template by ID
 */
export function getTemplateById(id: string): ContentTemplate | undefined {
  return contentTemplates.find(t => t.id === id);
}

/**
 * Get recommended templates for content type
 */
export function getRecommendedTemplates(contentType: string): ContentTemplate[] {
  const recommendations: Record<string, string[]> = {
    blog: ['storytelling', 'scqa', 'before-after-bridge', 'none'],
    social: ['hook-story-offer', 'aida', 'storytelling', 'none'],
    email: ['aida', 'pas', 'hook-story-offer', 'none'],
    caption: ['hook-story-offer', 'aida', 'none'],
    article: ['scqa', '4cs', 'storytelling', 'none']
  };

  const templateIds = recommendations[contentType] || ['none'];
  return templateIds.map(id => getTemplateById(id)).filter(Boolean) as ContentTemplate[];
}
