# Sineva AI - Platform Planning Document

## 1. Platform Overview

**Name**: Sineva AI  
**Vision**: AI-powered marketing automation platform with intelligent orchestration  
**Current Phase**: Phase 1 - Service Enhancement and Optimization

## 2. Design Vision

### Design Inspiration Mix
- **Albert.ai**: Clean, professional interface with clear information hierarchy
- **Google Labs (Pomelli)**: Aesthetic appeal, experimental feel, engaging interactions
- **Bolt.host Marketing Module**: Content presentation and layout structure

### Key Design Principles
- Clean, minimalist interface (Albert.ai)
- Playful, engaging aesthetics (Google Labs)
- Clear content hierarchy (Bolt.host)
- Smooth animations and transitions
- Responsive, mobile-first design

## 3. Technology Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS with custom design system
- React Router for navigation
- TanStack Query for data fetching

### Backend
- Supabase (Own instance - NOT Lovable Cloud)
- Supabase Auth for authentication
- Supabase Edge Functions for API endpoints
- PostgreSQL database

### AI Integration Strategy
- **Multi-Model Approach**: Option B - Intelligent Routing
- Own API keys for all services
- Model selection based on task requirements, cost, and quality

## 4. Core Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Sineva AI Platform                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────┐  ┌───────────────┐  ┌──────────────┐   │
│  │   Frontend    │  │   Supabase    │  │   AI Models  │   │
│  │   React App   │◄─┤   Backend     │◄─┤   External   │   │
│  └───────────────┘  └───────────────┘  └──────────────┘   │
│                                                               │
│  Phase 1 Services (Focus):                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  1. AI Graphic Generator                             │   │
│  │  2. AI Video Generator                               │   │
│  │  3. Smart Onboarding & Brand Kit                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  Existing Services (To Be Enhanced Later):                   │
│  • Content Generation • Calendar Management                  │
│  • Social Media Posting • Website Builder                    │
│  • Ad Campaign Manager • Lead Nurturing CRM                  │
│                                                               │
│  Future Phase 2:                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           AI Orchestrator (Central Hub)              │   │
│  │  • Unified Chat Interface                            │   │
│  │  • Cross-Service Context Management                  │   │
│  │  • Intelligent Prompt Refinement                     │   │
│  │  • Automated Action Execution                        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 5. Database Schema Design

### 5.1 User Management

```sql
-- User Roles Enum
CREATE TYPE app_role AS ENUM ('admin', 'moderator', 'user');

-- User Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Roles (Security: Separate table to prevent privilege escalation)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Security function for role checking
CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

### 5.2 Brand Kit & Onboarding

```sql
-- Brand Kit (Smart Onboarding output)
CREATE TABLE brand_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_type TEXT NOT NULL, -- 'new_business', 'running_business', 'growth'
  company_name TEXT NOT NULL,
  industry TEXT,
  target_audience TEXT,
  brand_voice TEXT,
  
  -- Visual Identity
  primary_color TEXT,
  secondary_color TEXT,
  logo_url TEXT,
  brand_guidelines JSONB,
  
  -- Assets
  scraped_data JSONB, -- Website, social media data
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Brand Assets (logos, images, files)
CREATE TABLE brand_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_kit_id UUID REFERENCES brand_kits(id) ON DELETE CASCADE NOT NULL,
  asset_type TEXT NOT NULL, -- 'logo', 'image', 'document', 'color_palette'
  file_url TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5.3 AI Graphic Generator

```sql
-- Graphic Generation History
CREATE TABLE graphic_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_kit_id UUID REFERENCES brand_kits(id),
  
  -- Generation Details
  prompt TEXT NOT NULL,
  refined_prompt TEXT, -- AI-optimized prompt
  graphic_type TEXT NOT NULL, -- 'social_media', 'ad', 'logo', 'illustration', 'photo_edit'
  platform TEXT, -- 'instagram', 'facebook', 'twitter', 'linkedin', 'pinterest'
  dimensions TEXT, -- '1080x1080', '1920x1080', etc.
  
  -- AI Model Used
  model_used TEXT NOT NULL, -- 'nano_banana_2', 'stability_ai'
  model_selection_reason TEXT, -- Why this model was chosen (intelligent routing)
  
  -- Output
  image_url TEXT,
  generation_time INTEGER, -- milliseconds
  
  -- Chat-based editing
  edit_history JSONB, -- Array of edits made via chat
  
  -- Metadata
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Graphic Templates (for common use cases)
CREATE TABLE graphic_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  graphic_type TEXT NOT NULL,
  platform TEXT NOT NULL,
  dimensions TEXT NOT NULL,
  default_prompt TEXT,
  thumbnail_url TEXT,
  is_public BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5.4 AI Video Generator

```sql
-- Video Generation History
CREATE TABLE video_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_kit_id UUID REFERENCES brand_kits(id),
  
  -- Generation Details
  prompt TEXT NOT NULL,
  refined_prompt TEXT,
  video_type TEXT NOT NULL, -- 'product_demo', 'social_ad', 'explainer', 'testimonial', etc.
  platform TEXT, -- 'youtube', 'instagram', 'tiktok', 'facebook'
  
  -- Video Specifications
  target_duration INTEGER, -- seconds
  aspect_ratio TEXT, -- '16:9', '9:16', '1:1', '4:5'
  has_audio BOOLEAN DEFAULT false,
  audio_type TEXT, -- 'voiceover', 'music', 'both', 'none'
  
  -- AI Model Used
  model_used TEXT NOT NULL, -- 'runway', 'veo_3', 'luma', 'magichour'
  model_selection_reason TEXT,
  
  -- Output
  video_url TEXT,
  video_segments JSONB, -- If video was created in multiple segments (ffmpeg)
  duration INTEGER, -- actual duration in seconds
  file_size INTEGER, -- bytes
  generation_time INTEGER, -- milliseconds
  
  -- Status
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Video Segments (for ffmpeg concatenation)
CREATE TABLE video_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_generation_id UUID REFERENCES video_generations(id) ON DELETE CASCADE NOT NULL,
  segment_order INTEGER NOT NULL,
  segment_url TEXT NOT NULL,
  duration INTEGER,
  model_used TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5.5 Cross-Service Tracking

```sql
-- AI Usage Analytics
CREATE TABLE ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  service_type TEXT NOT NULL, -- 'graphic', 'video', 'content', etc.
  model_used TEXT NOT NULL,
  tokens_used INTEGER,
  cost_estimate DECIMAL(10, 4),
  generation_time INTEGER,
  success BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Credits/Quota System
CREATE TABLE user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  credit_balance INTEGER DEFAULT 0,
  total_used INTEGER DEFAULT 0,
  last_refill TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 6. Phase 1 Service Specifications

### 6.1 AI Graphic Generator

#### Features
- **Use Cases**: Social media graphics, ads, logos, illustrations, photo editing
- **AI Models**: 
  - Nano Banana 2 (Gemini 2.5 Flash Image)
  - Stability AI
- **Intelligent Routing Logic**:
  ```
  IF (graphic_type === 'logo' OR graphic_type === 'illustration') 
    THEN prefer Stability AI
  ELSE IF (graphic_type === 'social_media' OR quick generation needed)
    THEN use Nano Banana 2
  ELSE 
    evaluate based on quality requirements
  ```
- **Platform-Specific Outputs**:
  - Instagram: 1080x1080 (post), 1080x1920 (story)
  - Facebook: 1200x630 (post), 1080x1920 (story)
  - Twitter: 1200x675
  - LinkedIn: 1200x627
  - Pinterest: 1000x1500
- **Chat-Based Editing**: 
  - Users can refine via chat: "Make it brighter", "Add company logo", "Change background"
  - Each edit creates a new generation with context

#### Research Requirements for Developer
1. **API Integration**:
   - Nano Banana 2 API documentation and capabilities
   - Stability AI API options and features
   - Rate limits and pricing comparison
2. **Quality Analysis**:
   - Test generation quality for different use cases
   - Speed benchmarks
   - Cost per generation
3. **Competitive Features**:
   - What features do Canva, Adobe Express, Midjourney offer?
   - How can we differentiate?
4. **Technical Challenges**:
   - Image editing capabilities
   - Brand consistency enforcement
   - Template system design

### 6.2 AI Video Generator

#### Features
- **Video Types**: All types (product demos, ads, explainers, social content, testimonials)
- **AI Models**:
  - Runway
  - Veo 3
  - Luma
  - Magichour
- **Intelligent Routing Logic**:
  ```
  IF (video_type === 'product_demo')
    THEN prefer Runway or Luma
  ELSE IF (video_type === 'quick_social')
    THEN use fastest model (evaluate Magichour)
  ELSE IF (high_quality_required)
    THEN use Veo 3
  ELSE
    evaluate based on duration and complexity
  ```
- **Duration Management**:
  - Respect model limits
  - Use FFmpeg to concatenate segments if needed
  - Automatic scene transitions
- **Audio Support**:
  - Voiceover generation
  - Background music
  - Both
  - Silent video option
- **Platform Optimization**:
  - YouTube: 16:9, longer duration
  - Instagram Reels: 9:16, up to 90s
  - TikTok: 9:16, up to 60s
  - Facebook: Multiple aspect ratios

#### Research Requirements for Developer
1. **API Integration**:
   - Runway Gen-3 API capabilities
   - Veo 3 access and features
   - Luma AI API documentation
   - Magichour integration options
2. **FFmpeg Implementation**:
   - Video concatenation strategies
   - Scene transition effects
   - Audio mixing capabilities
3. **Quality & Performance**:
   - Generation time for each model
   - Quality comparison
   - Cost analysis per second of video
4. **Technical Challenges**:
   - Handling long video requests
   - Audio synchronization
   - Platform-specific encoding requirements

### 6.3 Smart Onboarding & Brand Kit

#### Features
- **Onboarding Flow Design**: Inspired by Pomelli's aesthetic
- **Business Type Options**:
  1. **New Business**: 
     - Guided brand creation
     - Industry selection
     - Target audience definition
     - Brand voice setup
  2. **Running Business**:
     - Import existing brand assets
     - Website scraping for brand info
     - Social media analysis
     - Existing asset upload
  3. **Growth Mode**:
     - Competitive analysis
     - Market positioning
     - Enhanced brand strategy
- **Data Collection Sources**:
  - Website scraping (company info, colors, logos, content)
  - Social media profiles (LinkedIn, Facebook, Instagram, Twitter)
  - User uploads (existing logos, documents, brand guidelines)
  - User input (questionnaire)
- **AI Analysis**:
  - Extract brand colors from logos/website
  - Identify brand voice from existing content
  - Generate brand personality insights
  - Suggest target audience profiles
- **Brand Kit Output**:
  - Logo repository
  - Color palette (primary, secondary, accent)
  - Typography recommendations
  - Brand voice guidelines
  - Target audience profiles
  - Competitor insights
  - Asset library

#### Research Requirements for Developer
1. **Scraping Technologies**:
   - Website scraping libraries and best practices
   - Social media API access (limitations and alternatives)
   - Screenshot and visual extraction tools
2. **AI Analysis**:
   - Color extraction from images
   - Brand voice analysis using LLMs
   - Competitive analysis automation
3. **UX Research**:
   - Onboarding best practices
   - Pomelli-style interactions
   - Form design for different business types
4. **Legal Considerations**:
   - Scraping terms of service compliance
   - Data privacy and storage
   - User consent requirements

## 7. Multi-Model Strategy: Option B (Intelligent Routing)

### Implementation Approach
The platform will automatically route requests to the best AI model based on:
1. **Task Requirements**: Quality vs. speed trade-offs
2. **User Context**: Brand kit, history, preferences
3. **Cost Optimization**: Balance quality with API costs
4. **Availability**: Fallback if primary model is unavailable

### Routing Decision Engine
```javascript
// Pseudocode for intelligent routing
function selectModel(request) {
  const factors = {
    taskType: request.type,
    qualityNeeds: analyzeQualityRequirements(request),
    speedRequirement: request.urgent ? 'high' : 'normal',
    budget: user.creditBalance,
    previousSuccess: getUserModelPreference(user, request.type)
  };
  
  const models = getAvailableModels(request.service);
  const scores = models.map(model => 
    scoreModel(model, factors)
  );
  
  return selectBestModel(scores);
}
```

### Benefits
- **Automatic Optimization**: No user decision fatigue
- **Cost Efficiency**: Use cheaper models when appropriate
- **Quality Assurance**: Route to best model for critical tasks
- **Learning System**: Improve routing based on user feedback

## 8. Developer Workflow

### Phase 1 Team Structure
- **Developer 1**: AI Graphic Generator
- **Developer 2**: AI Video Generator  
- **Developer 3**: Smart Onboarding & Brand Kit
- **Developer 4**: Integration & DevOps
- **Developer 5 (You)**: Architecture, orchestration planning, coordination

### Individual Service Development
Each developer will:
1. **Research Phase** (1-2 weeks):
   - Explore APIs and models
   - Create comparison matrix
   - Test integrations
   - Document findings in their service doc
2. **Development Phase** (3-4 weeks):
   - Build service in isolated Lovable.dev project
   - Implement core features
   - Create UI following design system
   - Test with sample data
3. **Documentation Phase** (1 week):
   - Document API endpoints
   - Create component documentation
   - Write integration guide
   - Prepare for merge

### Shared Component Library
- Create a shared UI component library (design system)
- All developers use the same:
  - Colors (from Tailwind config)
  - Typography
  - Button styles
  - Form components
  - Layout components
- Document components in Storybook or similar

### Integration Strategy
1. **Service Communication**:
   - Each service exposes REST API via Supabase Edge Functions
   - Services are stateless
   - All data flows through central database
2. **Merge Process**:
   - Developer completes service
   - Code review by team
   - Integration testing in staging environment
   - Merge to main platform
3. **Future AI Orchestrator**:
   - Will sit as a layer above all services
   - Interprets user intent
   - Routes requests to appropriate service
   - Maintains conversation context

## 9. Development Phases & Timeline

### Phase 1: Service Enhancement (Current - 8-10 weeks)
**Weeks 1-2**: Research & Planning
- API exploration
- Model testing
- Architecture finalization
- Design system creation

**Weeks 3-6**: Core Development
- Parallel service development
- Database setup
- API integration
- UI implementation

**Weeks 7-8**: Testing & Refinement
- Individual service testing
- Integration testing
- Bug fixes
- Performance optimization

**Weeks 9-10**: Integration
- Merge services into main platform
- End-to-end testing
- Documentation
- Staging deployment

### Phase 2: AI Orchestrator (Future - 12-16 weeks)
- Conversational AI development
- Context management system
- Cross-service intelligence
- Unified chat interface
- Production deployment

### Phase 3: Full Platform Enhancement (Future)
- Remaining services optimization
- Advanced features
- Analytics and reporting
- Mobile applications

## 10. Design System

### Color Palette (HSL - Tailwind CSS Variables)
```css
:root {
  /* Primary - Clean, professional (Albert.ai inspired) */
  --primary: 222 47% 11%;
  --primary-foreground: 210 40% 98%;
  
  /* Accent - Playful, engaging (Google Labs inspired) */
  --accent: 210 100% 60%;
  --accent-foreground: 222 47% 11%;
  
  /* Backgrounds */
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;
  
  /* Muted for subtle elements */
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  
  /* Borders and inputs */
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
}

.dark {
  --background: 222 47% 11%;
  --foreground: 210 40% 98%;
  /* ... dark mode variants */
}
```

### Typography
- **Headings**: Bold, clear hierarchy
- **Body**: Readable, 16px base
- **Mono**: Code and technical info

### Component Patterns
- **Cards**: Clean with subtle shadows (Albert.ai)
- **Buttons**: Rounded, clear CTAs
- **Forms**: Inline validation, helpful hints
- **Animations**: Smooth, playful (Google Labs)
- **Layout**: Spacious, breathing room

## 11. Security Considerations

### Authentication
- Supabase Auth with email/password
- Optional: OAuth providers (Google, GitHub)
- JWT-based session management

### Authorization
- Role-based access control (admin, moderator, user)
- Row-level security on all tables
- Security definer functions for role checks

### Data Protection
- API keys stored in Supabase secrets (never in code)
- User data encryption at rest
- HTTPS for all communications
- Rate limiting on API endpoints

### Input Validation
- Sanitize all user inputs
- Prevent prompt injection attacks
- File upload validation and scanning

## 12. API Cost Management

### Monitoring
- Track usage per user
- Log model selection and costs
- Alert on unusual patterns

### Credit System
- User credit balance
- Different models consume different credits
- Credit packages for purchase
- Free tier with limits

### Optimization
- Cache similar requests
- Reuse similar outputs
- Intelligent model selection to minimize costs

## 13. Next Steps for Kickoff

### Immediate Actions
1. **Database Setup**:
   - Create Supabase project
   - Run schema migrations
   - Set up RLS policies
   - Create security functions

2. **Design System**:
   - Create Figma/design files
   - Build component library
   - Document design tokens
   - Share with team

3. **Developer Assignments**:
   - Assign services to developers
   - Share research requirements
   - Set up individual Lovable.dev projects
   - Schedule weekly sync meetings

4. **Infrastructure**:
   - Set up staging environment
   - Configure CI/CD
   - Set up monitoring and logging
   - Create API documentation structure

### Week 1 Deliverables
- [ ] Finalized database schema deployed
- [ ] Design system components ready
- [ ] Developer research documents started
- [ ] Supabase project configured
- [ ] Team communication channels set up

## 14. Success Metrics

### Phase 1 Goals
- **Performance**: Generation time < 30s for graphics, < 2min for videos
- **Quality**: 90%+ user satisfaction with outputs
- **Cost**: Average cost per generation < $X
- **Reliability**: 99% uptime for services
- **UX**: Onboarding completion rate > 80%

### Technical Metrics
- API response time < 3s
- Database query performance optimized
- Frontend load time < 2s
- Mobile responsiveness score > 95

---

## Appendix A: Technology Comparison Matrices

### Graphic Generation Models
| Model | Speed | Quality | Cost | Use Case |
|-------|-------|---------|------|----------|
| Nano Banana 2 | Fast | Good | Low | Social media, quick iterations |
| Stability AI | Medium | Excellent | Medium | Logos, illustrations, high-quality |

### Video Generation Models
| Model | Speed | Quality | Cost | Max Duration | Use Case |
|-------|-------|---------|------|--------------|----------|
| Runway | Fast | Excellent | High | 5s | Product demos, high-quality |
| Veo 3 | Medium | Excellent | High | 8s | Premium content |
| Luma | Fast | Good | Medium | 5s | Quick videos |
| Magichour | Fast | Good | Low | 6s | Social media, high volume |

---

## Appendix B: Pomelli-Inspired Onboarding Flow

```
[Welcome Screen - Aesthetic, animated]
      ↓
[Business Type Selection]
├─→ New Business
│   ├─→ Industry Selection
│   ├─→ Target Audience
│   ├─→ Brand Voice Quiz
│   └─→ Generate Initial Brand Kit
│
├─→ Running Business
│   ├─→ Website Input (scraping)
│   ├─→ Social Media Connect
│   ├─→ Upload Existing Assets
│   └─→ AI Analysis → Brand Kit
│
└─→ Growth Mode
    ├─→ Import Current Brand
    ├─→ Competitor Analysis
    ├─→ Market Positioning
    └─→ Enhanced Brand Strategy
    
[Review & Finalize Brand Kit]
      ↓
[Platform Dashboard]
```

---

**Document Status**: Draft v1.0  
**Last Updated**: [Current Date]  
**Next Review**: After team kickoff meeting
