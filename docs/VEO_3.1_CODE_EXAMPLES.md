# VEO 3.1 Code Examples

## Complete Implementation Examples

### Example 1: Product Demo Video (High Quality)

```typescript
import { generateVertexToken } from './vertex-auth';

async function generateProductDemo(productName: string): Promise<string> {
  const vertexToken = await generateVertexToken();
  const projectId = Deno.env.get('VERTEX_PROJECT_ID');
  const location = 'us-central1';
  
  // Use Standard Model for high quality
  const modelId = 'veo-3.1-generate-001';
  
  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:generateVideo`;
  
  const payload = {
    instances: [{
      prompt: `Professional product demonstration of ${productName}. 
        Camera slowly orbits around the product on a clean white background.
        Soft studio lighting highlights the product's premium features.
        Smooth, cinematic camera movement. High-end commercial aesthetic.`,
      aspectRatio: '16:9',
      stylePreset: 'cinematic',
      negativePrompt: 'blurry, low quality, shaky, amateur, distorted',
      durationSeconds: 10
    }],
    parameters: {
      sampleCount: 1,
      seed: Date.now()
    }
  };
  
  // Initiate generation
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${vertexToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    throw new Error(`VEO API error: ${response.status} - ${await response.text()}`);
  }
  
  const data = await response.json();
  const operationName = data.name;
  
  // Poll for completion
  const videoUri = await pollOperation(operationName, vertexToken);
  
  console.log(`Product demo generated: ${videoUri}`);
  return videoUri;
}

async function pollOperation(operationName: string, vertexToken: string): Promise<string> {
  const pollEndpoint = `https://us-central1-aiplatform.googleapis.com/v1/${operationName}`;
  const maxAttempts = 60; // 5 minutes max
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const pollResponse = await fetch(pollEndpoint, {
      headers: { 'Authorization': `Bearer ${vertexToken}` }
    });
    
    const pollData = await pollResponse.json();
    
    if (pollData.done) {
      if (pollData.error) {
        throw new Error(`Generation failed: ${JSON.stringify(pollData.error)}`);
      }
      return pollData.response.generatedSamples[0].video.uri;
    }
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    attempts++;
  }
  
  throw new Error('Operation timeout');
}
```

### Example 2: Social Media Story (Fast Generation)

```typescript
async function generateSocialStory(
  storyPrompt: string,
  mood: 'energetic' | 'calm' | 'professional'
): Promise<string> {
  const vertexToken = await generateVertexToken();
  const projectId = Deno.env.get('VERTEX_PROJECT_ID');
  
  // Use Fast Model for quick social content
  const modelId = 'veo-3.1-fast-generate-001';
  
  const moodStyles = {
    energetic: 'fast-paced, vibrant colors, dynamic movement',
    calm: 'slow motion, soft lighting, peaceful atmosphere',
    professional: 'clean, modern, corporate aesthetic'
  };
  
  const enhancedPrompt = `${storyPrompt}. ${moodStyles[mood]}. 
    Vertical format optimized for mobile viewing. 
    Instagram Story style with modern aesthetics.`;
  
  const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/${modelId}:generateVideo`;
  
  const payload = {
    instances: [{
      prompt: enhancedPrompt,
      aspectRatio: '9:16', // Vertical for stories
      stylePreset: mood === 'professional' ? 'documentary' : 'cinematic',
      durationSeconds: 5 // Short for social
    }]
  };
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${vertexToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  const data = await response.json();
  const videoUri = await pollOperation(data.name, vertexToken);
  
  return videoUri;
}
```

### Example 3: Image-to-Video Animation (Preview Model)

```typescript
async function animateProductImage(
  imageUrl: string,
  animationPrompt: string
): Promise<string> {
  const vertexToken = await generateVertexToken();
  const projectId = Deno.env.get('VERTEX_PROJECT_ID');
  
  // Use Preview Model for image-to-video
  const modelId = 'veo-3.1-generate-preview';
  
  // Download and encode image
  const imageResponse = await fetch(imageUrl);
  const imageBuffer = await imageResponse.arrayBuffer();
  const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
  
  const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/${modelId}:generateVideo`;
  
  const payload = {
    instances: [{
      prompt: animationPrompt,
      aspectRatio: '1:1',
      referenceImages: [{
        bytesBase64Encoded: base64Image,
        imageMetadata: {
          mimeType: 'image/jpeg'
        }
      }],
      durationSeconds: 5
    }]
  };
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${vertexToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    throw new Error(`Image-to-video failed: ${await response.text()}`);
  }
  
  const data = await response.json();
  return await pollOperation(data.name, vertexToken);
}

// Usage example
const videoUri = await animateProductImage(
  'https://example.com/product.jpg',
  'The product slowly rotates 360 degrees, revealing all features. Smooth, professional rotation with studio lighting.'
);
```

### Example 4: Batch Video Generation with Queue

```typescript
class VeoRequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private requestsPerMinute = 60;
  private requestInterval = 60000 / this.requestsPerMinute;
  
  async enqueue<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      if (!this.processing) {
        this.processQueue();
      }
    });
  }
  
  private async processQueue() {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const request = this.queue.shift();
      if (request) {
        await request();
        await new Promise(resolve => setTimeout(resolve, this.requestInterval));
      }
    }
    
    this.processing = false;
  }
}

async function generateBatchVideos(prompts: string[]): Promise<string[]> {
  const queue = new VeoRequestQueue();
  const vertexToken = await generateVertexToken();
  const projectId = Deno.env.get('VERTEX_PROJECT_ID');
  
  // Use Fast Model for batch generation
  const modelId = 'veo-3.1-fast-generate-001';
  
  const videoPromises = prompts.map(prompt =>
    queue.enqueue(async () => {
      const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/${modelId}:generateVideo`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${vertexToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          instances: [{
            prompt,
            aspectRatio: '16:9',
            durationSeconds: 5
          }]
        })
      });
      
      const data = await response.json();
      return await pollOperation(data.name, vertexToken);
    })
  );
  
  return await Promise.all(videoPromises);
}

// Usage: Generate 10 variations for A/B testing
const variations = await generateBatchVideos([
  'Product demo with blue background',
  'Product demo with white background',
  'Product demo with gradient background',
  // ... 7 more variations
]);
```

### Example 5: Video Extension (Preview Model)

```typescript
async function extendVideo(
  existingVideoUri: string,
  extensionPrompt: string,
  durationSeconds: number = 5
): Promise<string> {
  const vertexToken = await generateVertexToken();
  const projectId = Deno.env.get('VERTEX_PROJECT_ID');
  
  // Use Preview Model for video extension
  const modelId = 'veo-3.1-generate-preview';
  
  // Extract first and last frames (you'll need FFmpeg for this)
  const { firstFrame, lastFrame } = await extractFrames(existingVideoUri);
  
  const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/${modelId}:generateVideo`;
  
  const payload = {
    instances: [{
      prompt: extensionPrompt,
      baseVideoUri: existingVideoUri,
      firstFrame: {
        bytesBase64Encoded: firstFrame
      },
      lastFrame: {
        bytesBase64Encoded: lastFrame
      },
      durationSeconds
    }]
  };
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${vertexToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  const data = await response.json();
  return await pollOperation(data.name, vertexToken);
}

async function extractFrames(videoUri: string): Promise<{
  firstFrame: string;
  lastFrame: string;
}> {
  // Placeholder - implement with FFmpeg
  // This would extract first and last frames and encode as base64
  throw new Error('extractFrames not implemented - requires FFmpeg');
}
```

### Example 6: Platform-Specific Video Generation

```typescript
const PLATFORM_SPECS = {
  youtube: { aspectRatio: '16:9', duration: 15, style: 'cinematic' },
  instagram_post: { aspectRatio: '1:1', duration: 10, style: 'vibrant' },
  instagram_story: { aspectRatio: '9:16', duration: 5, style: 'mobile-first' },
  tiktok: { aspectRatio: '9:16', duration: 15, style: 'energetic' },
  linkedin: { aspectRatio: '16:9', duration: 10, style: 'professional' }
};

async function generateForPlatform(
  platform: keyof typeof PLATFORM_SPECS,
  prompt: string
): Promise<string> {
  const specs = PLATFORM_SPECS[platform];
  const vertexToken = await generateVertexToken();
  const projectId = Deno.env.get('VERTEX_PROJECT_ID');
  
  // Use Fast Model for social platforms, Standard for YouTube/LinkedIn
  const modelId = ['youtube', 'linkedin'].includes(platform)
    ? 'veo-3.1-generate-001'
    : 'veo-3.1-fast-generate-001';
  
  const enhancedPrompt = `${prompt}. Optimized for ${platform}. ${specs.style} style.`;
  
  const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/${modelId}:generateVideo`;
  
  const payload = {
    instances: [{
      prompt: enhancedPrompt,
      aspectRatio: specs.aspectRatio,
      stylePreset: specs.style === 'professional' ? 'documentary' : 'cinematic',
      durationSeconds: specs.duration
    }]
  };
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${vertexToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  const data = await response.json();
  return await pollOperation(data.name, vertexToken);
}

// Usage
const youtubeVideo = await generateForPlatform('youtube', 'Product launch announcement');
const tiktokVideo = await generateForPlatform('tiktok', 'Behind the scenes');
```

### Example 7: Error Recovery and Fallback

```typescript
async function generateWithFallback(
  prompt: string,
  aspectRatio: string
): Promise<{ videoUri: string; modelUsed: string }> {
  const models = [
    { id: 'veo-3.1-generate-001', name: 'Standard Model' },
    { id: 'veo-3.1-fast-generate-001', name: 'Fast Model' }
  ];
  
  for (const model of models) {
    try {
      console.log(`Attempting generation with ${model.name}...`);
      
      const videoUri = await generateVideo(prompt, aspectRatio, model.id);
      
      return {
        videoUri,
        modelUsed: model.id
      };
    } catch (error) {
      console.error(`${model.name} failed:`, error);
      
      // If this was the last model, throw
      if (model.id === models[models.length - 1].id) {
        throw new Error('All models failed');
      }
      
      // Otherwise, try next model
      console.log('Trying fallback model...');
    }
  }
  
  throw new Error('All generation attempts failed');
}

async function generateVideo(
  prompt: string,
  aspectRatio: string,
  modelId: string
): Promise<string> {
  const vertexToken = await generateVertexToken();
  const projectId = Deno.env.get('VERTEX_PROJECT_ID');
  
  const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/${modelId}:generateVideo`;
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${vertexToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      instances: [{
        prompt,
        aspectRatio,
        durationSeconds: 5
      }]
    })
  });
  
  if (!response.ok) {
    throw new Error(`Generation failed: ${response.status}`);
  }
  
  const data = await response.json();
  return await pollOperation(data.name, vertexToken);
}
```

### Example 8: Cost Tracking and Monitoring

```typescript
interface VideoGenerationMetrics {
  videoId: string;
  modelUsed: string;
  prompt: string;
  duration: number;
  aspectRatio: string;
  generationTime: number;
  cost: number;
  timestamp: string;
}

async function generateVideoWithTracking(
  prompt: string,
  config: {
    aspectRatio: string;
    duration: number;
    modelId: string;
  }
): Promise<{ videoUri: string; metrics: VideoGenerationMetrics }> {
  const startTime = Date.now();
  
  // Generate video
  const videoUri = await generateVideo(prompt, config.aspectRatio, config.modelId);
  
  const generationTime = Date.now() - startTime;
  
  // Calculate cost
  const costRates = {
    'veo-3.1-generate-001': 0.12,
    'veo-3.1-fast-generate-001': 0.04,
    'veo-3.1-generate-preview': 0.15
  };
  
  const baseCost = costRates[config.modelId] || 0.12;
  const cost = baseCost * (config.duration / 5);
  
  // Create metrics
  const metrics: VideoGenerationMetrics = {
    videoId: videoUri.split('/').pop() || 'unknown',
    modelUsed: config.modelId,
    prompt: prompt.substring(0, 100), // Truncate for storage
    duration: config.duration,
    aspectRatio: config.aspectRatio,
    generationTime,
    cost,
    timestamp: new Date().toISOString()
  };
  
  // Log metrics (send to your analytics system)
  await logMetrics(metrics);
  
  return { videoUri, metrics };
}

async function logMetrics(metrics: VideoGenerationMetrics) {
  // Send to Supabase or other analytics platform
  console.log('Video Generation Metrics:', metrics);
  
  // Example: Save to database
  // await supabase.from('video_metrics').insert(metrics);
}
```

## Testing Examples

```typescript
// tests/veo-generation.test.ts
import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/testing/asserts.ts';

Deno.test('VEO 3.1 - Generate video successfully', async () => {
  const videoUri = await generateVideo(
    'A beautiful sunset over the ocean',
    '16:9',
    'veo-3.1-fast-generate-001'
  );
  
  assertExists(videoUri);
  assertEquals(videoUri.startsWith('gs://'), true);
});

Deno.test('VEO 3.1 - Handle rate limiting', async () => {
  // Make many requests to trigger rate limiting
  const promises = Array(10).fill(null).map(() =>
    generateWithRetry('Test video', '16:9')
  );
  
  const results = await Promise.allSettled(promises);
  const successful = results.filter(r => r.status === 'fulfilled').length;
  
  // At least some should succeed despite rate limiting
  assertEquals(successful > 0, true);
});
```

These examples provide a comprehensive foundation for integrating VEO 3.1 into your video generation service.
