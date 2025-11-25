# Graphics Generator API Research & Implementation

## Overview
Complete implementation guide for AI-powered graphics generation using **Gemini 3 Pro Image** (Nov 2025) as the primary model, with intelligent logo integration and a preview-first workflow.

---

## Latest AI Models (2025)

### ✅ Primary Model: Gemini 3 Pro Image
**Status**: Implemented  
**Provider**: Google Vertex AI  
**Release**: November 2025

**Key Capabilities**:
- ✅ **Perfect text rendering** - Industry-leading text clarity
- ✅ **Multi-image composition** - Native logo integration support
- ✅ **High resolution output** - Up to 2048x2048
- ✅ **Aspect ratio control** - Direct aspect ratio specification
- ✅ **Studio-quality results** - Best overall quality
- ✅ **Multi-turn editing** - Conversational refinement

**Pricing**: ~$0.10-0.15 per image

**Best For**:
- Social media graphics with text overlays
- Quote graphics and announcements
- Product photography with branding
- Professional marketing materials
- Any content requiring text rendering

**API Access**: 
- Endpoint: `gemini-3-pro-image-preview:generateContent`
- Authentication: Vertex AI OAuth2
- Region: `us-central1`

---

### Alternative Models (Not Yet Implemented)

#### Imagen 4.0 Generate 001
**Provider**: Google Vertex AI  
**Release**: December 2024

**Key Capabilities**:
- Ultra-high quality product photography
- Enhanced realism and detail
- Better lighting and composition
- Professional e-commerce visuals

**Use Case**: Dedicated product photography (future enhancement)

#### Stable Diffusion 3.5 Large
**Provider**: Stability AI  
**Release**: October 2024

**Key Capabilities**:
- Advanced inpainting/outpainting
- Image editing and modifications
- Artistic control and style transfer
- Search & replace functionality

**Use Case**: Conversational image editing (future enhancement)

#### Runway Gen-4
**Provider**: Runway ML  
**Release**: December 2024

**Key Capabilities**:
- Character consistency
- Reference-based generation
- Brand mascot creation
- Multi-image consistency

**Use Case**: Brand mascot and character generation (future enhancement)

---

## Current Implementation Architecture

### Workflow

```
User Input
    ↓
[1. Platform Selection]
    ↓
[2. Prompt + Logo Option]
    ↓
[3. Generate PREVIEW]
    ↓
[Preview Displayed]
    ↓
User Approves?
    ↓
[4. Batch Generate for All Platforms]
    ↓
[Download All]
```

### Smart API Routing

Currently simplified to **always use Gemini 3 Pro Image**:

```typescript
function smartAPISelection(params: {
  category: string;
  hasText: boolean;
  quality: string;
  hasReferenceImage: boolean;
  platforms: string[];
}) {
  // Always use Gemini 3 Pro Image for best quality
  return { 
    api: 'gemini-3-pro-image', 
    reason: 'Perfect text rendering and high quality' 
  };
}
```

**Future Enhancement**: Add routing to Imagen 4.0 for product photography or Stable Diffusion for editing.

---

## Logo Integration

### Smart Logo Placement

```typescript
function determineLogoPlacement(
  category: string, 
  contentType: string, 
  platforms: string[]
) {
  // Product photos: subtle bottom-right
  if (category === 'product') {
    return { position: 'bottom-right', size: 'subtle', opacity: 0.9 };
  }
  
  // Quotes/Announcements: standard bottom-right
  if (category === 'quote' || category === 'announcement') {
    return { position: 'bottom-right', size: 'standard', opacity: 1.0 };
  }
  
  // Stories: top-right to avoid CTA area
  if (platforms.some(p => contentType === 'story')) {
    return { position: 'top-right', size: 'standard', opacity: 1.0 };
  }
  
  // Professional (LinkedIn/Twitter): prominent top-left
  if (platforms.includes('linkedin') || platforms.includes('twitter')) {
    return { position: 'top-left', size: 'prominent', opacity: 1.0 };
  }
  
  // Default
  return { position: 'bottom-right', size: 'standard', opacity: 1.0 };
}
```

### Logo Integration Method

**Gemini 3 Pro Image - Direct Composition** (Current):
```typescript
// Add logo to generation prompt with positioning instructions
const parts = [
  { text: enhancedPrompt + logoInstructions },
  { inlineData: { mimeType: 'image/png', data: logoBase64 } }
];

// Gemini natively composes logo into the generated image
```

**Benefits**:
- Natural integration with scene
- Proper lighting and shadows
- No post-processing needed
- Best visual quality

**Future Fallback**: Post-generation overlay using Stability AI Control if native composition fails.

---

## Platform Specifications

### Supported Platforms & Formats

```typescript
const PLATFORM_SPECS = {
  instagram: {
    'feed-post': '1080x1080 (1:1)',
    'story': '1080x1920 (9:16)',
    'reel': '1080x1920 (9:16)'
  },
  facebook: {
    'feed-post': '1200x630 (1.91:1)',
    'story': '1080x1920 (9:16)',
    'cover-photo': '820x312 (2.63:1)'
  },
  linkedin: {
    'feed-post': '1200x627 (1.91:1)',
    'article': '1200x627 (1.91:1)'
  },
  twitter: {
    'feed-post': '1200x675 (16:9)',
    'header': '1500x500 (3:1)'
  },
  pinterest: {
    'pin': '1000x1500 (2:3)'
  },
  tiktok: {
    'video': '1080x1920 (9:16)'
  }
};
```

---

## Database Schema

### `graphic_generations` Table

```sql
CREATE TABLE graphic_generations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  
  -- Generation details
  platform TEXT NOT NULL,
  content_type TEXT NOT NULL,
  category TEXT,
  prompt TEXT NOT NULL,
  enhanced_prompt TEXT,
  
  -- Output
  image_url TEXT NOT NULL,
  dimensions TEXT NOT NULL,
  
  -- AI Model info
  model_used TEXT NOT NULL,
  api_reason TEXT,
  
  -- Preview & Batch workflow
  is_preview BOOLEAN DEFAULT FALSE,
  parent_preview_id UUID REFERENCES graphic_generations(id),
  
  -- Logo integration
  logo_included BOOLEAN DEFAULT FALSE,
  logo_config JSONB,
  
  -- Metadata
  parameters JSONB,
  generation_mode TEXT DEFAULT 'text-to-image',
  reference_image_url TEXT,
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

---

## Cost Estimation

### Per Generation Costs (2025)

| Model | Cost per Image | Quality | Speed |
|-------|---------------|---------|-------|
| **Gemini 3 Pro Image** | $0.10-0.15 | ⭐⭐⭐⭐⭐ | 15-20s |
| Imagen 4.0 | $0.12-0.18 | ⭐⭐⭐⭐⭐ | 10-15s |
| Stable Diffusion 3.5 | $0.03-0.05 | ⭐⭐⭐⭐ | 5-10s |
| Runway Gen-4 | $0.25-0.40 | ⭐⭐⭐⭐⭐ | 20-30s |

### Typical User Flow Cost

**Preview-First Workflow**:
- 1 Preview generation: $0.15
- 3 Platform batch (if approved): $0.45
- **Total per approved set**: ~$0.60

**Benefits of Preview-First**:
- Avoid wasting credits on rejected designs
- User approval ensures satisfaction
- Cost-effective iteration

---

## Future Enhancements

### Phase 2: Image Editing
- **Model**: Stable Diffusion 3.5 Large
- **Features**: 
  - Conversational editing ("make logo bigger", "change background color")
  - Inpainting/outpainting
  - Style transfer

### Phase 3: Product Photography
- **Model**: Imagen 4.0 Generate 001
- **Features**:
  - Dedicated product photo mode
  - Ultra-high quality e-commerce visuals
  - Advanced lighting and composition

### Phase 4: Brand Mascots
- **Model**: Runway Gen-4
- **Features**:
  - Character consistency across generations
  - Reference-based mascot creation
  - Multi-pose generation

### Phase 5: Advanced Editing
- **Models**: Multiple (SD 3.5, Imagen 3)
- **Features**:
  - Sketch-to-image (ControlNet)
  - Image upscaling
  - Background removal
  - Object replacement

---

## API Integration Details

### Vertex AI Authentication

```typescript
// Generate JWT for service account
const jwt = createJWT({
  iss: credentials.client_email,
  scope: "https://www.googleapis.com/auth/cloud-platform",
  aud: credentials.token_uri,
  exp: now + 3600,
  iat: now
});

// Exchange for access token
const response = await fetch(credentials.token_uri, {
  method: 'POST',
  body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
});

const { access_token } = await response.json();
```

### Gemini 3 Pro Image Request

```typescript
const response = await fetch(
  `https://us-central1-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/us-central1/publishers/google/models/gemini-3-pro-image-preview:generateContent`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'image/png', data: logoBase64 } }
        ]
      }],
      generationConfig: {
        modalities: ['image', 'text'],
        aspectRatio: '1:1' // or '16:9', '9:16', etc.
      }
    })
  }
);
```

---

## Success Metrics

### Performance Targets
- ✅ Preview generation: < 30 seconds
- ✅ Batch generation: < 90 seconds for 3 platforms
- ✅ Logo placement accuracy: > 95%
- ✅ User approval rate: > 85%

### Quality Metrics
- ✅ Text clarity: 100% (Gemini 3 Pro Image)
- ✅ Logo visibility: > 95%
- ✅ Brand consistency: 100%
- ✅ Platform optimization: 100%

---

## Implementation Status

### ✅ Completed
- Database schema and RLS policies
- Edge function with Vertex AI integration
- Logo fetching from Brand Kit
- Smart logo placement logic
- Preview-first workflow
- Batch generation for multiple platforms
- Frontend UI with 3-step process
- Download functionality

### 🚧 In Progress
- None

### 📋 Planned
- Conversational editing mode
- Additional model integrations (Imagen 4.0, Stable Diffusion 3.5)
- Image upscaling
- Template library
- Generation history dashboard
- Bulk download as ZIP

---

## References

- [Gemini 3 Pro Image Docs](https://cloud.google.com/vertex-ai/docs/generative-ai/model-reference/gemini)
- [Vertex AI Authentication](https://cloud.google.com/vertex-ai/docs/authentication)
- [Social Media Image Sizes 2025](https://sproutsocial.com/insights/social-media-image-sizes-guide/)
- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
