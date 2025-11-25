# Chat Video & Image Generation Architecture

## Overview

The chat system uses an **agent-centric, service-agnostic architecture** where the AI orchestrator detects user intent and routes to specialized services.

## Architecture Flow

### 1. Intent Detection & Routing

**Location**: `supabase/functions/_shared/service-registry.ts`

The service registry defines all available services with:
- Keywords for intent detection
- Tool definitions (functions the AI can call)
- Edge function mappings
- System prompts for each service

```typescript
const videoService: ServiceConfig = {
  id: 'video',
  keywords: ['video', 'clip', 'story', 'ad', 'commercial', 'reel', ...],
  tools: [{ name: 'generate_automated_video_story', ... }],
  edgeFunction: 'generate-video-story-automated'
}
```

### 2. Chat Orchestrator

**Location**: `supabase/functions/chat-orchestrator/index.ts`

**Process**:
1. User sends message
2. Orchestrator detects services from keywords (e.g., "video" → video service)
3. Builds context-aware system prompt with service info
4. Calls Gemini 2.5 Pro with tool calling enabled
5. AI decides which tool to call based on user intent
6. Orchestrator invokes the edge function via tool call
7. Returns result to frontend

**Example Flow**:
```
User: "create a video about coffee"
→ detectServices() finds 'video' keyword
→ Gemini sees available tools: generate_automated_video_story
→ Gemini calls tool with: { userPrompt: "coffee", extractedInfo: {...} }
→ Orchestrator invokes generate-video-story-automated
→ Returns videoId to chat
```

### 3. Video Generation Edge Function

**Location**: `supabase/functions/generate-video-story-automated/index.ts`

**Process**:
1. Authenticates user
2. Extracts video parameters (duration, platforms, style, tone)
3. Fetches user's Brand Kit
4. Creates `video_generations` record with status: 'generating'
5. **Scene Planning**: Calls Gemini 2.5 Pro to plan scenes
6. **Image Generation**: Generates images for each scene with Gemini 3 Pro Image
7. **Video Clip Generation**: Uses VEO 3.1 API to generate video clips
8. **Assembly**: Combines clips (placeholder - currently uses first clip)
9. Updates status to 'completed' or 'failed'
10. Returns video details

**Error Points**:
- ❌ **VEO API Authentication**: 403 errors if scopes insufficient
- ❌ **Rate Limits**: VEO allows 1 req/second
- ❌ **Timeout**: Long-running operations (60-120s)
- ❌ **Scene Generation Failures**: Individual scenes can fail

### 4. Frontend Chat Context

**Location**: `src/contexts/ChatContext.tsx`

Manages conversation state and workflows:
```typescript
interface ServiceWorkflow {
  service: 'video' | 'graphics' | ...
  stage: 'idle' | 'setup' | 'generating' | 'complete'
  config: { videoId, status, duration, platforms, ... }
  results: [{ video_url, thumbnail_url, ... }]
}
```

**Current Issues**:
- ❌ No polling for video status after generation starts
- ❌ Assumes success if edge function returns
- ❌ No detection if video gets stuck in 'generating' state
- ❌ No real-time progress updates

### 5. Video UI Components

**Location**: `src/components/chat/video/`

- `VideoPlatformSelector.tsx`: Select platforms, duration, quality
- `VideoSetupForm.tsx`: Additional options (tone, voiceover, etc.)
- `VideoGenerationProgress.tsx`: Shows progress during generation
- `VideoPreviewCard.tsx`: Displays completed video

**Current Issues**:
- ❌ Progress component shows static steps, not real status
- ❌ No error state handling
- ❌ No stuck detection

## Image Generation (Working Correctly)

**Why it works better**:

1. **Faster execution** (5-10s vs 60-120s for video)
2. **Simpler workflow**:
   - Generate preview → User reviews → Batch generate
3. **Immediate results** in response
4. **Less failure modes** (single API call vs multi-step pipeline)

**Location**: 
- Service: `supabase/functions/generate-graphic/index.ts`
- Uses Gemini 3 Pro Image (Nano banana)
- Returns image URLs immediately in function response

## Critical Differences: Image vs Video

| Aspect | Image | Video |
|--------|-------|-------|
| Duration | 5-10s | 60-120s |
| API Calls | 1 (Gemini) | 3+ (Gemini Pro → Gemini Image → VEO 3.1) |
| Result Return | Immediate | Async (polling needed) |
| Failure Modes | 1 (image gen fails) | 5+ (auth, scene plan, images, clips, assembly) |
| Error Visibility | Immediate | Hidden (background process) |

## Current Error Handling Gaps

### 1. VEO Authentication Error
```
Error: VEO API failed: 403 - Request had insufficient authentication scopes
```
**Impact**: Videos fail silently, chat doesn't know
**Root Cause**: Missing OAuth scopes in Vertex AI token

### 2. No Status Polling
- Function returns videoId immediately
- Chat assumes success
- No mechanism to check if video actually completed

### 3. No Stuck Detection
- Videos can get stuck in 'generating' state
- User waits indefinitely
- No timeout or retry mechanism

### 4. Poor Error Propagation
- Edge function errors don't reach chat UI
- Generic "failed" status in database
- No actionable error messages to user

## Recommended Improvements

### 1. Implement Status Polling
```typescript
// In ChatContext after getting videoId
const pollVideoStatus = async (videoId: string) => {
  const maxAttempts = 60; // 5 minutes
  for (let i = 0; i < maxAttempts; i++) {
    const { data } = await supabase
      .from('video_generations')
      .select('status, video_url, error_message')
      .eq('id', videoId)
      .single();
    
    if (data.status === 'completed') return data;
    if (data.status === 'failed') throw new Error(data.error_message);
    
    await new Promise(r => setTimeout(r, 5000)); // Wait 5s
  }
  throw new Error('Video generation timeout');
};
```

### 2. Enhanced Error Handling in Edge Function
```typescript
try {
  // Generate video clips
  const clips = await generateVideoClips(...);
} catch (error) {
  // Update status with detailed error
  await supabase
    .from('video_generations')
    .update({
      status: 'failed',
      error_message: `VEO Error: ${error.message}`,
      metadata: { error_type: 'veo_auth', retry_possible: false }
    })
    .eq('id', videoGen.id);
  
  throw error; // Propagate to orchestrator
}
```

### 3. Real-Time Progress Updates
- Use Supabase Realtime to stream status changes
- Update UI as each stage completes
- Show which scene is currently generating

### 4. Graceful Degradation
- If VEO fails, offer alternative (e.g., image slideshow)
- Provide clear next steps to user
- Allow retry with different settings

## Next Steps

1. **Fix VEO Authentication**: Add correct OAuth scopes
2. **Implement Polling**: Chat polls video status every 5s
3. **Add Error States**: Handle all failure modes in UI
4. **Add Timeout Detection**: Mark stuck videos as failed after 5 min
5. **Improve Feedback**: Show real progress, not simulated steps
