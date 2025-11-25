/**
 * Frontend Service Registry - UI Component Mappings & Configurations
 * This registry defines which UI components to render for each service
 */

import { lazy, ComponentType } from 'react';

// ========== TYPE DEFINITIONS ==========

export interface ServiceSetupRequirement {
  field: string;
  label: string;
  type: 'text' | 'select' | 'multiselect' | 'file' | 'number' | 'toggle';
  required: boolean;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  description?: string;
  validation?: (value: any) => string | null; // Returns error message or null
}

export interface ServiceUIComponents {
  // Setup Dialog - Rendered when user initiates service
  setupDialog?: ComponentType<any>;
  
  // Result Cards - Rendered based on workflow stage
  previewCard?: ComponentType<any>; // For 'preview' stage
  editCard?: ComponentType<any>; // For 'editing' stage
  batchCard?: ComponentType<any>; // For 'batch' stage
  
  // Inline components for chat (optional compact versions)
  inlinePreview?: ComponentType<any>;
  inlineBatch?: ComponentType<any>;
}

export interface FrontendServiceConfig {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind color class
  setupRequirements: ServiceSetupRequirement[];
  components: ServiceUIComponents;
  
  // Validation functions
  validateSetup?: (config: any) => { valid: boolean; errors: Record<string, string> };
  
  // Helper functions
  getDefaultConfig?: () => any;
  formatResultForDisplay?: (result: any) => any;
}

// ========== GRAPHICS SERVICE CONFIGURATION ==========

const graphicsServiceConfig: FrontendServiceConfig = {
  id: 'graphics',
  name: 'Graphics Generator',
  description: 'Powered by Gemini 3.0 Pro Image (Nano banana pro) - Unified AI generation',
  icon: 'Image',
  color: 'text-purple-500',
  
  setupRequirements: [
    {
      field: 'prompt',
      label: 'What should the graphic be about?',
      type: 'text',
      required: true,
      placeholder: 'E.g., "A vibrant sunset over mountains with inspirational quote"',
      description: 'Describe what you want to see in your graphic',
      validation: (value) => {
        if (!value || value.trim().length === 0) return 'Prompt is required';
        if (value.length < 10) return 'Prompt should be at least 10 characters';
        return null;
      }
    },
    {
      field: 'platforms',
      label: 'Select Platforms',
      type: 'multiselect',
      required: true,
      options: [
        { value: 'instagram', label: 'Instagram' },
        { value: 'facebook', label: 'Facebook' },
        { value: 'twitter', label: 'Twitter' },
        { value: 'linkedin', label: 'LinkedIn' },
        { value: 'pinterest', label: 'Pinterest' },
        { value: 'tiktok', label: 'TikTok' }
      ],
      description: 'Choose which platforms you want to create graphics for',
      validation: (value) => {
        if (!value || value.length === 0) return 'Select at least one platform';
        return null;
      }
    },
    {
      field: 'quality',
      label: 'Quality',
      type: 'select',
      required: false,
      options: [
        { value: 'standard', label: 'Standard (Faster)' },
        { value: 'high', label: 'High Quality' }
      ],
      description: 'Higher quality takes longer to generate'
    },
    {
      field: 'includeLogo',
      label: 'Include My Logo',
      type: 'toggle',
      required: false,
      description: 'Add your brand logo to the graphic'
    },
    {
      field: 'referenceImage',
      label: 'Reference Image (Optional)',
      type: 'file',
      required: false,
      description: 'Upload an image for style reference'
    },
    {
      field: 'negativePrompt',
      label: 'Negative Prompt (Optional)',
      type: 'text',
      required: false,
      placeholder: 'E.g., "blurry, low quality, text"',
      description: 'What to avoid in the generation'
    }
  ],
  
  components: {
    setupDialog: lazy(() => import('@/components/services/graphics/GraphicSetupDialog')),
    previewCard: lazy(() => import('@/components/services/graphics/GraphicPreviewCard')),
    editCard: lazy(() => import('@/components/services/graphics/GraphicEditCard')),
    batchCard: lazy(() => import('@/components/services/graphics/GraphicBatchCard'))
  },
  
  validateSetup: (config) => {
    const errors: Record<string, string> = {};
    
    if (!config.prompt || config.prompt.trim().length < 10) {
      errors.prompt = 'Prompt must be at least 10 characters';
    }
    
    if (!config.platforms || config.platforms.length === 0) {
      errors.platforms = 'Select at least one platform';
    }
    
    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  },
  
  getDefaultConfig: () => ({
    platforms: ['instagram'],
    quality: 'standard',
    includeLogo: false,
    prompt: ''
  }),
  
  formatResultForDisplay: (result) => ({
    imageUrl: result.image_url || result.imageUrl,
    platform: result.platform,
    dimensions: result.dimensions,
    generatedAt: result.created_at
  })
};

// ========== VIDEO SERVICE CONFIGURATION (Placeholder) ==========

const videoServiceConfig: FrontendServiceConfig = {
  id: 'video',
  name: 'Video Generator',
  description: 'Create engaging video content with AI',
  icon: 'Video',
  color: 'text-blue-500',
  
  setupRequirements: [
    {
      field: 'prompt',
      label: 'What should the video be about?',
      type: 'text',
      required: true,
      placeholder: 'E.g., "Product showcase with dynamic transitions"',
      validation: (value) => {
        if (!value || value.trim().length === 0) return 'Prompt is required';
        return null;
      }
    },
    {
      field: 'duration',
      label: 'Duration (seconds)',
      type: 'number',
      required: true,
      placeholder: '15',
      description: 'Video length in seconds (5-60)',
      validation: (value) => {
        if (!value) return 'Duration is required';
        if (value < 5 || value > 60) return 'Duration must be between 5-60 seconds';
        return null;
      }
    },
    {
      field: 'format',
      label: 'Video Format',
      type: 'select',
      required: true,
      options: [
        { value: '9:16', label: 'Vertical (9:16) - Stories/Reels' },
        { value: '16:9', label: 'Horizontal (16:9) - YouTube' },
        { value: '1:1', label: 'Square (1:1) - Feed Posts' }
      ]
    }
  ],
  
  components: {
    setupDialog: undefined,
    previewCard: undefined,
    batchCard: undefined
  },
  
  validateSetup: (config) => {
    const errors: Record<string, string> = {};
    
    if (!config.prompt) {
      errors.prompt = 'Prompt is required';
    }
    
    if (!config.duration || config.duration < 5 || config.duration > 60) {
      errors.duration = 'Duration must be between 5-60 seconds';
    }
    
    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  },
  
  getDefaultConfig: () => ({
    format: '9:16',
    duration: 15,
    prompt: ''
  })
};

// ========== EMAIL SERVICE CONFIGURATION ==========

const emailServiceConfig: FrontendServiceConfig = {
  id: 'email',
  name: 'Email Generator',
  description: 'AI-powered email creation and sending',
  icon: 'Mail',
  color: 'text-blue-500',
  
  setupRequirements: [],
  components: {}, // No special UI needed, handled in chat
  
  getDefaultConfig: () => ({})
};

// ========== CALENDAR SERVICE CONFIGURATION ==========

const calendarServiceConfig: FrontendServiceConfig = {
  id: 'calendar',
  name: 'Content Calendar',
  description: 'Schedule and manage social media posts',
  icon: 'Calendar',
  color: 'text-orange-500',
  
  setupRequirements: [],
  components: {}, // No special UI needed, handled in chat
  
  getDefaultConfig: () => ({})
};

// ========== CONTENT SERVICE CONFIGURATION (Placeholder) ==========

const contentServiceConfig: FrontendServiceConfig = {
  id: 'content',
  name: 'Content Writer',
  description: 'Generate engaging content with AI',
  icon: 'FileText',
  color: 'text-green-500',
  
  setupRequirements: [
    {
      field: 'contentType',
      label: 'Content Type',
      type: 'select',
      required: true,
      options: [
        { value: 'blog', label: 'Blog Post' },
        { value: 'caption', label: 'Social Media Caption' },
        { value: 'email', label: 'Email Copy' },
        { value: 'ad', label: 'Ad Copy' }
      ]
    },
    {
      field: 'topic',
      label: 'Topic',
      type: 'text',
      required: true,
      placeholder: 'E.g., "Benefits of morning routines"',
      validation: (value) => {
        if (!value || value.trim().length === 0) return 'Topic is required';
        return null;
      }
    },
    {
      field: 'tone',
      label: 'Tone',
      type: 'select',
      required: false,
      options: [
        { value: 'professional', label: 'Professional' },
        { value: 'casual', label: 'Casual' },
        { value: 'friendly', label: 'Friendly' },
        { value: 'enthusiastic', label: 'Enthusiastic' }
      ]
    }
  ],
  
  components: {
    setupDialog: undefined,
    previewCard: undefined,
    batchCard: undefined
  },
  
  validateSetup: (config) => {
    const errors: Record<string, string> = {};
    
    if (!config.topic) {
      errors.topic = 'Topic is required';
    }
    
    if (!config.contentType) {
      errors.contentType = 'Content type is required';
    }
    
    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  },
  
  getDefaultConfig: () => ({
    contentType: 'caption',
    tone: 'professional',
    topic: ''
  })
};

// ========== CENTRAL FRONTEND SERVICE REGISTRY ==========

export const FRONTEND_SERVICE_REGISTRY: FrontendServiceConfig[] = [
  graphicsServiceConfig,
  videoServiceConfig,
  emailServiceConfig,
  calendarServiceConfig,
  contentServiceConfig
];

// ========== HELPER FUNCTIONS ==========

/**
 * Get service configuration by ID
 */
export function getServiceConfig(serviceId: string): FrontendServiceConfig | undefined {
  return FRONTEND_SERVICE_REGISTRY.find(s => s.id === serviceId);
}

/**
 * Get all available services
 */
export function getAllServices(): FrontendServiceConfig[] {
  return FRONTEND_SERVICE_REGISTRY;
}

/**
 * Get setup requirements for a service
 */
export function getServiceSetupRequirements(serviceId: string): ServiceSetupRequirement[] {
  const service = getServiceConfig(serviceId);
  return service?.setupRequirements || [];
}

/**
 * Validate service setup configuration
 */
export function validateServiceSetup(
  serviceId: string, 
  config: any
): { valid: boolean; errors: Record<string, string> } {
  const service = getServiceConfig(serviceId);
  
  if (!service) {
    return { valid: false, errors: { service: 'Service not found' } };
  }
  
  if (service.validateSetup) {
    return service.validateSetup(config);
  }
  
  // Default validation: check required fields
  const errors: Record<string, string> = {};
  
  service.setupRequirements.forEach(req => {
    if (req.required && !config[req.field]) {
      errors[req.field] = `${req.label} is required`;
    }
    
    // Run field-specific validation
    if (config[req.field] && req.validation) {
      const error = req.validation(config[req.field]);
      if (error) {
        errors[req.field] = error;
      }
    }
  });
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Get default configuration for a service
 */
export function getServiceDefaultConfig(serviceId: string): any {
  const service = getServiceConfig(serviceId);
  return service?.getDefaultConfig ? service.getDefaultConfig() : {};
}

/**
 * Get UI components for a service
 */
export function getServiceComponents(serviceId: string): ServiceUIComponents | undefined {
  const service = getServiceConfig(serviceId);
  return service?.components;
}

/**
 * Format service result for display
 */
export function formatServiceResult(serviceId: string, result: any): any {
  const service = getServiceConfig(serviceId);
  return service?.formatResultForDisplay 
    ? service.formatResultForDisplay(result)
    : result;
}

/**
 * Get service by workflow stage - returns appropriate component
 */
export function getServiceComponentForStage(
  serviceId: string, 
  stage: 'setup' | 'preview' | 'editing' | 'batch'
): ComponentType<any> | undefined {
  const components = getServiceComponents(serviceId);
  if (!components) return undefined;
  
  switch (stage) {
    case 'setup':
      return components.setupDialog;
    case 'preview':
      return components.previewCard;
    case 'editing':
      return components.editCard;
    case 'batch':
      return components.batchCard;
    default:
      return undefined;
  }
}

/**
 * Check if service has a specific component registered
 */
export function hasServiceComponent(
  serviceId: string,
  componentType: keyof ServiceUIComponents
): boolean {
  const components = getServiceComponents(serviceId);
  return components ? !!components[componentType] : false;
}

/**
 * Get service icon and color for display
 */
export function getServiceDisplayInfo(serviceId: string): {
  name: string;
  icon: string;
  color: string;
} | undefined {
  const service = getServiceConfig(serviceId);
  if (!service) return undefined;
  
  return {
    name: service.name,
    icon: service.icon,
    color: service.color
  };
}
