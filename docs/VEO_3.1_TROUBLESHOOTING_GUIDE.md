# VEO 3.1 Troubleshooting Guide

## Common Issues and Solutions

### 1. Rate Limit Errors (429)

#### Problem
```
Error: Rate limit exceeded (429)
{
  "error": {
    "code": 429,
    "message": "Resource has been exhausted (e.g. check quota)."
  }
}
```

#### Root Causes
- Too many concurrent requests
- Exceeding requests per minute quota
- Burst traffic patterns

#### Solutions

**Solution 1: Implement Exponential Backoff**
```typescript
async function generateWithRetry(
  payload: any,
  modelId: string,
  maxRetries = 5
): Promise<string> {
  let retries = 0;
  let delay = 1000; // Start with 1 second
  
  while (retries < maxRetries) {
    try {
      const operationName = await initiateGeneration(payload, modelId);
      return await pollOperation(operationName);
    } catch (error: any) {
      if (error.status === 429) {
        console.log(`Rate limited (attempt ${retries + 1}/${maxRetries}), waiting ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * 2, 32000); // Exponential backoff, max 32s
        retries++;
      } else {
        throw error;
      }
    }
  }
  
  throw new Error('Max retries exceeded due to rate limiting');
}
```

**Solution 2: Implement Request Queue**
```typescript
class VeoRequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private requestsPerMinute = 60;
  private requestInterval = 60000 / this.requestsPerMinute; // ms between requests
  
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

// Usage
const veoQueue = new VeoRequestQueue();
const videoUri = await veoQueue.enqueue(() => generateVideo(prompt));
```

### 2. Content Policy Violations

#### Problem
```
Error: Content policy violation
{
  "error": {
    "code": 400,
    "message": "The request contains content that violates our content policy."
  }
}
```

#### Root Causes
- Explicit or violent content in prompt
- Copyrighted material references
- Unsafe or harmful content

#### Solutions

**Solution 1: Implement Prompt Sanitization**
```typescript
function sanitizePrompt(prompt: string): string {
  const bannedWords = [
    'violence', 'explicit', 'gore', 'nsfw',
    // Add more based on your needs
  ];
  
  let sanitized = prompt;
  bannedWords.forEach(word => {
    const regex = new RegExp(word, 'gi');
    sanitized = sanitized.replace(regex, '');
  });
  
  return sanitized.trim();
}
```

**Solution 2: Add Negative Prompts**
```typescript
async function generateSafeVideo(prompt: string): Promise<string> {
  const payload = {
    instances: [{
      prompt: sanitizePrompt(prompt),
      aspectRatio: '16:9',
      negativePrompt: 'violence, explicit content, gore, nsfw, inappropriate'
    }]
  };
  
  return await generateWithRetry(payload, 'veo-3.1-generate-001');
}
```

### 3. Long Running Operation Timeout

#### Problem
```
Error: Operation timeout
Operation did not complete within expected time (5+ minutes)
```

#### Root Causes
- Network connectivity issues
- Vertex AI service degradation
- Very complex video generation

#### Solutions

**Solution 1: Implement Timeout with Retry**
```typescript
async function pollOperationWithTimeout(
  operationName: string,
  timeoutMs = 300000, // 5 minutes
  pollIntervalMs = 5000
): Promise<string> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const pollEndpoint = `https://us-central1-aiplatform.googleapis.com/v1/${operationName}`;
      const response = await fetch(pollEndpoint, {
        headers: { Authorization: `Bearer ${vertexToken}` }
      });
      
      if (!response.ok) {
        throw new Error(`Polling failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.done) {
        if (data.error) {
          throw new Error(`Operation failed: ${JSON.stringify(data.error)}`);
        }
        return data.response.generatedSamples[0].video.uri;
      }
      
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    } catch (error) {
      console.error('Polling error:', error);
      throw error;
    }
  }
  
  throw new Error('Operation timeout exceeded');
}
```

**Solution 2: Background Processing with Status Updates**
```typescript
async function generateVideoWithStatusUpdates(
  prompt: string,
  onStatusUpdate: (status: string) => void
): Promise<string> {
  onStatusUpdate('Initiating video generation...');
  const operationName = await initiateGeneration(prompt);
  
  onStatusUpdate('Processing (0%)...');
  
  const pollInterval = 5000;
  let elapsed = 0;
  
  while (true) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));
    elapsed += pollInterval;
    
    const progress = Math.min(Math.floor((elapsed / 120000) * 100), 99);
    onStatusUpdate(`Processing (${progress}%)...`);
    
    const result = await checkOperation(operationName);
    if (result.done) {
      onStatusUpdate('Complete!');
      return result.uri;
    }
  }
}
```

### 4. Invalid Aspect Ratio or Resolution

#### Problem
```
Error: Invalid aspect ratio
{
  "error": {
    "code": 400,
    "message": "Unsupported aspect ratio: 21:9"
  }
}
```

#### Root Causes
- Using unsupported aspect ratio
- Requesting unsupported resolution

#### Solutions

**Solution: Validate Before API Call**
```typescript
const SUPPORTED_ASPECT_RATIOS = ['16:9', '9:16', '1:1'];

function validateVideoConfig(config: {
  aspectRatio: string;
  durationSeconds: number;
}): { valid: boolean; error?: string } {
  if (!SUPPORTED_ASPECT_RATIOS.includes(config.aspectRatio)) {
    return {
      valid: false,
      error: `Aspect ratio ${config.aspectRatio} not supported. Use ${SUPPORTED_ASPECT_RATIOS.join(', ')}`
    };
  }
  
  if (config.durationSeconds < 3 || config.durationSeconds > 60) {
    return {
      valid: false,
      error: 'Duration must be between 3 and 60 seconds'
    };
  }
  
  return { valid: true };
}

async function generateVideoSafe(prompt: string, config: any): Promise<string> {
  const validation = validateVideoConfig(config);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  
  return await generateVideo(prompt, config);
}
```

### 5. Authentication Errors (401)

#### Problem
```
Error: Unauthorized
{
  "error": {
    "code": 401,
    "message": "Request had invalid authentication credentials."
  }
}
```

#### Root Causes
- Expired access token
- Invalid service account credentials
- Missing IAM permissions

#### Solutions

**Solution 1: Token Refresh Logic**
```typescript
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getValidVertexToken(): Promise<string> {
  const now = Date.now();
  
  // Check if cached token is still valid (with 5 min buffer)
  if (cachedToken && cachedToken.expiresAt > now + 300000) {
    return cachedToken.token;
  }
  
  // Generate new token
  const newToken = await generateVertexToken();
  cachedToken = {
    token: newToken,
    expiresAt: now + 3600000 // 1 hour
  };
  
  return newToken;
}

async function generateVideo(prompt: string): Promise<string> {
  const token = await getValidVertexToken();
  // Use token for API call
}
```

**Solution 2: Verify IAM Permissions**
```bash
# Check if service account has required role
gcloud projects get-iam-policy PROJECT_ID \
  --flatten="bindings[].members" \
  --format='table(bindings.role)' \
  --filter="bindings.members:serviceAccount:SERVICE_ACCOUNT_EMAIL"

# Add role if missing
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
  --role="roles/aiplatform.user"
```

### 6. Image Reference Issues (Preview Models)

#### Problem
```
Error: Invalid reference image
{
  "error": {
    "code": 400,
    "message": "Reference image must be less than 4MB"
  }
}
```

#### Root Causes
- Image too large (>4MB)
- Unsupported image format
- Invalid base64 encoding

#### Solutions

**Solution: Image Validation and Compression**
```typescript
async function validateReferenceImage(imageUrl: string): Promise<{
  valid: boolean;
  error?: string;
  size?: number;
}> {
  const response = await fetch(imageUrl);
  const buffer = await response.arrayBuffer();
  const size = buffer.byteLength;
  
  if (size > 4 * 1024 * 1024) {
    return {
      valid: false,
      error: `Image too large: ${(size / 1024 / 1024).toFixed(2)}MB (max 4MB)`,
      size
    };
  }
  
  const contentType = response.headers.get('content-type');
  if (!contentType?.startsWith('image/')) {
    return {
      valid: false,
      error: 'Invalid content type: must be an image'
    };
  }
  
  return { valid: true, size };
}

async function prepareReferenceImage(imageUrl: string): Promise<string> {
  const validation = await validateReferenceImage(imageUrl);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  
  const response = await fetch(imageUrl);
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}
```

### 7. Performance Optimization Issues

#### Problem
Video generation is slower than expected

#### Solutions

**Solution 1: Use Fast Model for Non-Critical Content**
```typescript
function selectModelBasedOnPriority(priority: 'low' | 'medium' | 'high'): string {
  if (priority === 'low' || priority === 'medium') {
    return 'veo-3.1-fast-generate-001'; // 2x faster
  }
  return 'veo-3.1-generate-001';
}
```

**Solution 2: Optimize Prompt Length**
```typescript
function optimizePrompt(prompt: string, maxLength = 200): string {
  if (prompt.length <= maxLength) {
    return prompt;
  }
  
  // Keep essential parts, trim unnecessary details
  const sentences = prompt.split('. ');
  let optimized = '';
  
  for (const sentence of sentences) {
    if ((optimized + sentence).length > maxLength) {
      break;
    }
    optimized += sentence + '. ';
  }
  
  return optimized.trim();
}
```

**Solution 3: Parallel Processing for Multiple Videos**
```typescript
async function generateMultipleVideos(prompts: string[]): Promise<string[]> {
  // Use Promise.allSettled to handle partial failures
  const results = await Promise.allSettled(
    prompts.map(prompt => generateWithRetry(
      { instances: [{ prompt, aspectRatio: '16:9' }] },
      'veo-3.1-fast-generate-001'
    ))
  );
  
  return results
    .filter(r => r.status === 'fulfilled')
    .map(r => (r as PromiseFulfilledResult<string>).value);
}
```

### 8. Debugging Checklist

When encountering issues, work through this checklist:

```typescript
async function debugVideoGeneration(config: {
  prompt: string;
  modelId: string;
  aspectRatio: string;
}): Promise<{ checks: Record<string, boolean>; errors: string[] }> {
  const checks: Record<string, boolean> = {};
  const errors: string[] = [];
  
  // 1. Check credentials
  try {
    const token = await getValidVertexToken();
    checks.credentials = !!token;
  } catch (error) {
    checks.credentials = false;
    errors.push(`Credentials error: ${error}`);
  }
  
  // 2. Check model ID
  const validModels = [
    'veo-3.1-generate-001',
    'veo-3.1-fast-generate-001',
    'veo-3.1-generate-preview'
  ];
  checks.validModel = validModels.includes(config.modelId);
  if (!checks.validModel) {
    errors.push(`Invalid model ID: ${config.modelId}`);
  }
  
  // 3. Check aspect ratio
  checks.validAspectRatio = ['16:9', '9:16', '1:1'].includes(config.aspectRatio);
  if (!checks.validAspectRatio) {
    errors.push(`Invalid aspect ratio: ${config.aspectRatio}`);
  }
  
  // 4. Check prompt
  checks.validPrompt = config.prompt.length > 0 && config.prompt.length < 1000;
  if (!checks.validPrompt) {
    errors.push(`Invalid prompt length: ${config.prompt.length}`);
  }
  
  // 5. Check quota (mock - implement actual check)
  checks.quotaAvailable = true;
  
  // 6. Test API connectivity
  try {
    const testEndpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1`;
    const response = await fetch(testEndpoint);
    checks.apiConnectivity = response.ok;
  } catch (error) {
    checks.apiConnectivity = false;
    errors.push(`API connectivity error: ${error}`);
  }
  
  return { checks, errors };
}
```

### 9. Monitoring and Alerting

**Setup Logging for Key Events**
```typescript
interface VideoGenerationLog {
  timestamp: string;
  modelId: string;
  prompt: string;
  status: 'initiated' | 'processing' | 'completed' | 'failed';
  duration?: number;
  error?: string;
  retryCount: number;
}

function logVideoGeneration(log: VideoGenerationLog) {
  console.log(JSON.stringify({
    ...log,
    timestamp: new Date().toISOString()
  }));
  
  // Send to monitoring service
  // e.g., await sendToDatadog(log);
}
```

**Track Performance Metrics**
```typescript
async function generateVideoWithMetrics(prompt: string): Promise<{
  videoUri: string;
  metrics: {
    totalTime: number;
    apiCallTime: number;
    pollingTime: number;
    downloadTime: number;
  }
}> {
  const startTime = Date.now();
  
  const apiStart = Date.now();
  const operationName = await initiateGeneration(prompt);
  const apiCallTime = Date.now() - apiStart;
  
  const pollStart = Date.now();
  const videoUri = await pollOperation(operationName);
  const pollingTime = Date.now() - pollStart;
  
  const downloadStart = Date.now();
  await downloadVideo(videoUri);
  const downloadTime = Date.now() - downloadStart;
  
  const totalTime = Date.now() - startTime;
  
  return {
    videoUri,
    metrics: {
      totalTime,
      apiCallTime,
      pollingTime,
      downloadTime
    }
  };
}
```

## Getting Help

If issues persist after trying these solutions:

1. **Check Vertex AI Status**: https://status.cloud.google.com/
2. **Review Quotas**: Check your project's Vertex AI quotas in Google Cloud Console
3. **Enable Detailed Logging**: Set log level to DEBUG for more information
4. **Contact Support**: Provide full error logs and reproduction steps
5. **Community Forums**: Search Google Cloud Community for similar issues

## Prevention Best Practices

1. Always implement retry logic with exponential backoff
2. Validate inputs before making API calls
3. Monitor rate limits and implement request queues
4. Keep credentials fresh with automatic token refresh
5. Log all errors with full context for debugging
6. Set up alerts for error rate spikes
7. Use Fast Model for testing to conserve quota
8. Cache results to avoid unnecessary regeneration
