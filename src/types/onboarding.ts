export type BusinessStage = 'starting_fresh' | 'already_running' | 'ready_to_scale';

export interface ScrapedData {
  companyName?: string;
  description?: string;
  industry?: string;
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    additional?: string[];
  };
  logoUrl?: string;
  tagline?: string;
  socialLinks?: Array<{ platform: string; url: string }>;
  brandFonts?: string[];
  categories?: string[];
  suggestedIndustry?: string;
  confidence?: number;
  rawContent?: string;
  contactInfo?: {
    email: string | null;
    phone: string | null;
    address: string | null;
  };
  businessHours?: string | null;
  location?: {
    city: string | null;
    state: string | null;
    country: string | null;
  };
  services?: string[];
  pagesAnalyzed?: number;
  screenshots?: {
    desktop: string | null;
    mobile: string | null;
  };
  visualAnalysis?: {
    designStyle: string;
    layoutType: string;
    typography: {
      style: string;
      hierarchy: string;
    };
    visualElements: string[];
    brandPersonality: string;
  } | null;
  brandIntelligence?: {
    brandVoice: {
      tone: string;
      characteristics: string[];
      confidence: number;
    };
    targetAudience: {
      demographics: string;
      psychographics: string;
      painPoints: string[];
      confidence: number;
    };
    industryAnalysis: {
      category: string;
      marketPosition: string;
      competitors: string[];
      trends: string[];
    };
    taglineSuggestions: Array<{
      text: string;
      rationale: string;
    }>;
    contentStrategy: {
      contentTypes: string[];
      postingFrequency: string;
      keyThemes: string[];
      platforms: string[];
    };
    brandStrengths: string[];
    marketingRecommendations: Array<{
      strategy: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
    }>;
  } | null;
}

export interface OnboardingData {
  // Step 1
  businessStage: BusinessStage;
  
  // Step 2
  websiteUrl?: string;
  companyName: string;
  industry: string;
  description: string;
  
  // Step 3
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl?: string;
  logoFile?: File;
  brandVoice: string;
  tagline: string;
  
  // Step 4
  goals: string[];
  targetAudience: string;
  monthlyBudget: number;
  currentChannels: string[];
  
  // Scraped metadata
  scrapedData?: ScrapedData;
  
  // AI recommendations
  aiRecommendations?: {
    contentTypes?: string[];
    platforms?: string[];
    postingFrequency?: string;
    campaignIdeas?: string[];
    keywords?: string[];
  };
}

export const INDUSTRIES = [
  'Technology & Software',
  'E-commerce & Retail',
  'Healthcare & Medical',
  'Finance & Banking',
  'Real Estate',
  'Education & Training',
  'Food & Beverage',
  'Travel & Hospitality',
  'Fashion & Apparel',
  'Beauty & Cosmetics',
  'Automotive',
  'Sports & Fitness',
  'Entertainment & Media',
  'Marketing & Advertising',
  'Legal Services',
  'Consulting & Professional Services',
  'Manufacturing',
  'Construction',
  'Agriculture',
  'Energy & Utilities',
  'Telecommunications',
  'Logistics & Transportation',
  'Insurance',
  'Non-profit & Charity',
  'Government & Public Sector',
  'Arts & Crafts',
  'Home & Garden',
  'Pet Services',
  'Photography & Videography',
  'Event Planning',
  'Interior Design',
  'Architecture',
  'Engineering',
  'HR & Recruitment',
  'Accounting & Tax',
  'Software as a Service (SaaS)',
  'Mobile Apps',
  'Web Development',
  'Cybersecurity',
  'Cloud Services',
  'AI & Machine Learning',
  'E-learning',
  'Gaming',
  'Music & Audio',
  'Publishing & Printing',
  'Pharmaceutical',
  'Biotechnology',
  'Medical Devices',
  'Mental Health',
  'Dental',
  'Veterinary',
  'Environmental Services',
  'Waste Management',
  'Renewable Energy',
  'Mining',
  'Jewelry & Accessories',
  'Furniture',
  'Electronics',
  'Appliances',
  'Toys & Games',
  'Books & Stationery',
  'Luxury Goods',
  'B2B Services',
  'Industrial Equipment',
];

export const BRAND_VOICES = [
  { value: 'professional', label: 'Professional', description: 'Formal, authoritative, and trustworthy' },
  { value: 'friendly', label: 'Friendly', description: 'Warm, approachable, and conversational' },
  { value: 'bold', label: 'Bold', description: 'Confident, edgy, and attention-grabbing' },
  { value: 'creative', label: 'Creative', description: 'Innovative, artistic, and inspiring' },
  { value: 'casual', label: 'Casual', description: 'Relaxed, informal, and relatable' },
  { value: 'authoritative', label: 'Authoritative', description: 'Expert, commanding, and influential' },
];

export const MARKETING_GOALS = [
  'Increase Brand Awareness',
  'Generate More Leads',
  'Boost Sales',
  'Improve Customer Engagement',
  'Launch New Products',
  'Enter New Markets',
  'Build Social Presence',
  'Content Marketing',
  'SEO Optimization',
  'Email Marketing',
];

export const MARKETING_CHANNELS = [
  'Social Media',
  'Email Marketing',
  'Paid Ads (Google, Facebook, etc.)',
  'Content Marketing',
  'SEO',
  'Influencer Marketing',
  'Events',
  'None yet',
];
