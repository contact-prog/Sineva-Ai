# VEO 3.1 Migration Guide

## Overview

This guide helps migrate from VEO 2.0 or other video generation models to VEO 3.1, including code updates, best practices, and optimization strategies.

## Migration Checklist

### Pre-Migration
- [ ] Review current video generation implementation
- [ ] Identify which model variant to use (Standard/Fast/Preview)
- [ ] Update Vertex AI credentials and permissions
- [ ] Test VEO 3.1 access in your project
- [ ] Plan rollout strategy (gradual vs. immediate)

### During Migration
- [ ] Update model IDs in code
- [ ] Refactor request/response handling
- [ ] Implement new error handling
- [ ] Update cost estimation logic
- [ ] Add rate limit handling
- [ ] Update database schemas for new metadata

### Post-Migration
- [ ] Monitor quality improvements
- [ ] Track cost changes
- [ ] Gather user feedback
- [ ] Optimize model selection logic
- [ ] Update documentation

## Code Migration Steps

### Step 1: Update Model IDs

**Before (VEO 2.0)**:
```typescript
const MODEL_ID = 'veo-2.0-generate-001';
```

**After (VEO 3.1)**:
```typescript
// Choose based on use case
const STANDARD_MODEL = 'veo-3.1-generate-001';      // High quality
const FAST_MODEL = 'veo-3.1-fast-generate-001';     // Fast generation
const PREVIEW_MODEL = 'veo-3.1-generate-preview';   // Advanced features
```

### Step 2: Update Request Payload

**Before**:
```typescript
const payload = {
  instances: [{
    prompt: videoPrompt,
    config: {
      aspectRatio: '16:9',
      duration: 5
    }
  }]
};
```

**After**:
```typescript
const payload = {
  instances: [{
    prompt: videoPrompt,
    aspectRatio: '16:9',
    stylePreset: 'cinematic',
    negativePrompt: 'blurry, distorted',
    durationSeconds: 5
  }],
  parameters: {
    sampleCount: 1,
    seed: Date.now() // For reproducibility
  }
};
```

### Step 3: Update API Endpoint Construction

**Before**:
```typescript
const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/veo-2.0-generate-001:predict`;
```

**After**:
```typescript
const location = 'us-central1';
const modelId = 'veo-3.1-generate-001';
const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:generateVideo`;
```

### Step 4: Update Response Handling

**Before (VEO 2.0 - Direct Response)**:
```typescript
const response = await fetch(endpoint, { method: 'POST', body: JSON.stringify(payload) });
const data = await response.json();
const videoUri = data.predictions[0].videoUri;
```

**After (VEO 3.1 - Long Running Operation)**:
```typescript
// 1. Initiate generation
const response = await fetch(endpoint, { method: 'POST', body: JSON.stringify(payload) });
const data = await response.json();
const operationName = data.name;

// 2. Poll for completion
async function pollOperation(operationName: string): Promise<string> {
  const pollEndpoint = `https://us-central1-aiplatform.googleapis.com/v1/${operationName}`;
  
  while (true) {
    const pollResponse = await fetch(pollEndpoint, {
      headers: { Authorization: `Bearer ${vertexToken}` }
    });
    const pollData = await pollResponse.json();
    
    if (pollData.done) {
      return pollData.response.generatedSamples[0].video.uri;
    }
    
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s
  }
}

const videoUri = await pollOperation(operationName);
```

### Step 5: Add Intelligent Model Selection

**New Feature in VEO 3.1**:
```typescript
function selectOptimalModel(context: {
  videoType: 'product' | 'social' | 'ad' | 'tutorial' | 'demo';
  qualityRequirement: 'standard' | 'high' | 'maximum';
  urgency: 'normal' | 'urgent';
  budget: 'standard' | 'premium';
}): string {
  const { videoType, qualityRequirement, urgency, budget } = context;
  
  // Urgent requests → Fast Model
  if (urgency === 'urgent') {
    return 'veo-3.1-fast-generate-001';
  }
  
  // Maximum quality requirement → Standard Model
  if (qualityRequirement === 'maximum') {
    return 'veo-3.1-generate-001';
  }
  
  // Social media → Fast Model (speed + volume)
  if (videoType === 'social' && budget === 'standard') {
    return 'veo-3.1-fast-generate-001';
  }
  
  // Product demos, ads → Standard Model
  if (['product', 'ad', 'demo'].includes(videoType)) {
    return 'veo-3.1-generate-001';
  }
  
  // Default to Fast Model for cost efficiency
  return 'veo-3.1-fast-generate-001';
}
```

### Step 6: Add Rate Limit Handling

**New in VEO 3.1**:
```typescript
async function generateWithRetry(
  payload: any,
  modelId: string,
  maxRetries = 3
): Promise<string> {
  let retries = 0;
  let delay = 1000; // Start with 1 second
  
  while (retries < maxRetries) {
    try {
      const operationName = await initiateGeneration(payload, modelId);
      return await pollOperation(operationName);
    } catch (error: any) {
      if (error.status === 429) {
        console.log(`Rate limited, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        retries++;
      } else {
        throw error;
      }
    }
  }
  
  throw new Error('Max retries exceeded');
}
```

### Step 7: Update Cost Estimation

**Before (VEO 2.0)**:
```typescript
function estimateCost(duration: number): number {
  return 0.10 * (duration / 5); // $0.10 per 5 seconds
}
```

**After (VEO 3.1)**:
```typescript
function estimateCost(duration: number, modelId: string): number {
  const rates = {
    'veo-3.1-generate-001': 0.12,
    'veo-3.1-fast-generate-001': 0.04,
    'veo-3.1-generate-preview': 0.15
  };
  
  const baseRate = rates[modelId] || 0.12;
  return baseRate * (duration / 5);
}
```

## Database Schema Updates

### Add New Columns to Track VEO 3.1 Metadata

```sql
ALTER TABLE video_generations 
ADD COLUMN veo_model_used VARCHAR(50),
ADD COLUMN generation_time_seconds INTEGER,
ADD COLUMN model_selection_reason TEXT,
ADD COLUMN retry_count INTEGER DEFAULT 0,
ADD COLUMN cost_usd DECIMAL(10, 4);

-- Create index for analytics
CREATE INDEX idx_video_generations_model ON video_generations(veo_model_used);
CREATE INDEX idx_video_generations_cost ON video_generations(cost_usd);
```

## Advanced Features Migration

### Image-to-Video (Preview Model Only)

**New Feature**:
```typescript
async function generateImageToVideo(
  imageUrl: string,
  animationPrompt: string
): Promise<string> {
  // 1. Download and encode image
  const imageResponse = await fetch(imageUrl);
  const imageBuffer = await imageResponse.arrayBuffer();
  const base64Image = Buffer.from(imageBuffer).toString('base64');
  
  // 2. Create request with reference image
  const payload = {
    instances: [{
      prompt: animationPrompt,
      aspectRatio: '9:16',
      referenceImages: [{
        bytesBase64Encoded: base64Image,
        imageMetadata: {
          mimeType: 'image/jpeg'
        }
      }]
    }]
  };
  
  // 3. Use Preview Model
  return await generateWithRetry(payload, 'veo-3.1-generate-preview');
}
```

## Testing Strategy

### Unit Tests

```typescript
describe('VEO 3.1 Migration', () => {
  it('should select Fast Model for social media', () => {
    const model = selectOptimalModel({
      videoType: 'social',
      qualityRequirement: 'standard',
      urgency: 'normal',
      budget: 'standard'
    });
    expect(model).toBe('veo-3.1-fast-generate-001');
  });
  
  it('should select Standard Model for product demos', () => {
    const model = selectOptimalModel({
      videoType: 'product',
      qualityRequirement: 'high',
      urgency: 'normal',
      budget: 'premium'
    });
    expect(model).toBe('veo-3.1-generate-001');
  });
  
  it('should estimate cost correctly', () => {
    const cost = estimateCost(10, 'veo-3.1-fast-generate-001');
    expect(cost).toBe(0.08); // $0.04 * 2 (10s / 5s)
  });
});
```

### Integration Tests

```typescript
describe('VEO 3.1 API Integration', () => {
  it('should generate video successfully', async () => {
    const videoUri = await generateWithRetry({
      instances: [{
        prompt: 'A beautiful sunset over the ocean',
        aspectRatio: '16:9'
      }]
    }, 'veo-3.1-fast-generate-001');
    
    expect(videoUri).toMatch(/^gs:\/\//);
  }, 120000); // 2 minute timeout
  
  it('should handle rate limiting gracefully', async () => {
    // Simulate many requests
    const promises = Array(10).fill(null).map(() =>
      generateWithRetry({
        instances: [{
          prompt: 'Test video',
          aspectRatio: '16:9'
        }]
      }, 'veo-3.1-fast-generate-001')
    );
    
    await expect(Promise.all(promises)).resolves.toBeDefined();
  });
});
```

## Rollout Strategy

### Option 1: Gradual Rollout (Recommended)

```typescript
const VEO_3_1_ROLLOUT_PERCENTAGE = 10; // Start with 10%

function shouldUseVeo31(): boolean {
  return Math.random() * 100 < VEO_3_1_ROLLOUT_PERCENTAGE;
}

async function generateVideo(prompt: string): Promise<string> {
  if (shouldUseVeo31()) {
    console.log('Using VEO 3.1');
    return await generateVeo31(prompt);
  } else {
    console.log('Using VEO 2.0 (fallback)');
    return await generateVeo20(prompt);
  }
}
```

### Option 2: Feature Flag

```typescript
const FEATURE_FLAGS = {
  veo31Enabled: process.env.VEO_31_ENABLED === 'true',
  veo31FastModelEnabled: true,
  veo31PreviewEnabled: false // Keep preview disabled initially
};

async function generateVideo(prompt: string): Promise<string> {
  if (FEATURE_FLAGS.veo31Enabled) {
    return await generateVeo31(prompt);
  }
  return await generateVeo20(prompt);
}
```

### Option 3: User Tier Based

```typescript
async function generateVideo(
  prompt: string,
  userTier: 'free' | 'pro' | 'enterprise'
): Promise<string> {
  // Enterprise users get VEO 3.1 Standard
  if (userTier === 'enterprise') {
    return await generateVeo31(prompt, 'veo-3.1-generate-001');
  }
  
  // Pro users get VEO 3.1 Fast
  if (userTier === 'pro') {
    return await generateVeo31(prompt, 'veo-3.1-fast-generate-001');
  }
  
  // Free users stay on VEO 2.0
  return await generateVeo20(prompt);
}
```

## Monitoring and Analytics

### Key Metrics to Track

```typescript
interface VeoMetrics {
  modelUsed: string;
  generationTimeMs: number;
  costUsd: number;
  qualityScore?: number; // User feedback
  retryCount: number;
  errorRate: number;
}

async function logVideoGeneration(metrics: VeoMetrics) {
  await supabase.from('ai_model_usage').insert({
    model_family: 'veo',
    model_version: metrics.modelUsed,
    generation_time_ms: metrics.generationTimeMs,
    cost_estimate: metrics.costUsd,
    success: metrics.errorRate === 0,
    metadata: {
      retry_count: metrics.retryCount,
      quality_score: metrics.qualityScore
    }
  });
}
```

### Dashboard Queries

```sql
-- Average cost by model
SELECT 
  veo_model_used,
  AVG(cost_usd) as avg_cost,
  COUNT(*) as video_count
FROM video_generations
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY veo_model_used;

-- Success rate by model
SELECT 
  veo_model_used,
  COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*) as success_rate
FROM video_generations
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY veo_model_used;

-- Average generation time
SELECT 
  veo_model_used,
  AVG(generation_time_seconds) as avg_time_seconds
FROM video_generations
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY veo_model_used;
```

## Common Migration Issues

### Issue 1: Authentication Errors

**Problem**: `401 Unauthorized` errors
**Solution**: Ensure service account has `Vertex AI User` role

```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
  --role="roles/aiplatform.user"
```

### Issue 2: Model Not Found

**Problem**: `404 Model not found`
**Solution**: Verify model ID and location

```typescript
// Correct format
const modelId = 'veo-3.1-generate-001'; // Not 'veo-3.1' or 'veo-3-1'
const location = 'us-central1'; // Check supported regions
```

### Issue 3: Rate Limiting

**Problem**: Frequent `429` errors
**Solution**: Implement request queue and exponential backoff (see Step 6)

### Issue 4: Timeout on Long Videos

**Problem**: Requests timeout for 30+ second videos
**Solution**: Use async processing pattern

```typescript
// Return immediately with operation ID
async function generateVideoAsync(prompt: string): Promise<string> {
  const operationName = await initiateGeneration(prompt);
  
  // Process polling in background
  processOperationInBackground(operationName);
  
  // Return operation ID immediately
  return operationName;
}
```

## Best Practices

1. **Always use exponential backoff for retries**
2. **Log all model selection decisions for analytics**
3. **Implement fallback to Fast Model if Standard fails**
4. **Cache generated videos to avoid regeneration**
5. **Monitor costs closely during migration**
6. **A/B test quality differences between models**
7. **Start with Fast Model, upgrade to Standard when needed**

## Rollback Plan

If migration encounters issues:

```typescript
const ENABLE_VEO_31 = false; // Quick rollback switch

async function generateVideo(prompt: string): Promise<string> {
  if (ENABLE_VEO_31) {
    try {
      return await generateVeo31(prompt);
    } catch (error) {
      console.error('VEO 3.1 failed, falling back to VEO 2.0', error);
      return await generateVeo20(prompt);
    }
  }
  
  return await generateVeo20(prompt);
}
```

## Next Steps

1. Review this guide thoroughly
2. Test VEO 3.1 in development environment
3. Implement model selection logic
4. Add monitoring and analytics
5. Start gradual rollout
6. Collect user feedback
7. Optimize based on metrics

## Support Resources

- [VEO 3.1 API Documentation](./VEO_3.1_API_DOCUMENTATION.md)
- [Model Comparison Guide](./VEO_3.1_MODEL_COMPARISON_GUIDE.md)
- [Troubleshooting Guide](./VEO_3.1_TROUBLESHOOTING_GUIDE.md)
- [Code Examples](./VEO_3.1_CODE_EXAMPLES.md)
