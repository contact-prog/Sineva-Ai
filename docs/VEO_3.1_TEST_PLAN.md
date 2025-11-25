# VEO 3.1 Integration Test Plan

## Test Overview
This document outlines the comprehensive testing approach for the VEO 3.1 model selection integration in Sineva AI's video generation service.

## Current Implementation Status

### ✅ Completed Components
1. **Backend Infrastructure**
   - ✅ `VeoModelSelector` - Intelligent model selection logic
   - ✅ `VeoRequestQueue` - Rate limiting and request management
   - ✅ `VeoErrorHandlers` - Retry logic and fallback mechanisms
   - ✅ `video-clip-generator.ts` - Updated with VEO 3.1 integration
   - ✅ `generate-video-story-automated` - Edge function with model tracking

2. **Frontend Components**
   - ✅ `StoryGenerateStep.tsx` - Video type detection and model display
   - ✅ Real-time cost/time estimates based on selected model
   - ✅ Progress tracking with VEO metadata display

3. **Database Schema**
   - ✅ `ai_model_usage` table - Model usage tracking
   - ✅ RLS policies configured
   - ✅ Video generation metadata fields

### 🔄 Configuration Verified
- ✅ Edge function timeout: 300 seconds
- ✅ Memory allocation: 512 MB
- ✅ JWT verification: Enabled
- ✅ VERTEX_AI_CREDENTIALS secret configured

---

## Test Scenarios

### Scenario 1: Social Media Video (Fast Model Expected)
**Objective:** Verify that social media videos use `veo-3.1-fast-generate-001`

**Test Steps:**
1. Navigate to `/videos`
2. Click "Generate Story Video"
3. Enter input: "Create a viral TikTok video about our new product launch"
4. Set parameters:
   - Duration: 15 seconds
   - Style: Viral
   - Platforms: TikTok, Instagram
   - Video Quality: Fast
5. Proceed to Generate step
6. **Expected Results:**
   - Video Type: `social`
   - Model: `veo-3.1-fast-generate-001`
   - Reasoning: "Social media content - speed and volume"
   - Est. Cost: ~$0.040-0.080
   - Est. Time: ~1-2 minutes

### Scenario 2: Product Demo (Standard Model Expected)
**Objective:** Verify that product demos use `veo-3.1-generate-001`

**Test Steps:**
1. Navigate to `/videos`
2. Click "Generate Story Video"
3. Enter input: "Create a professional product demonstration showcasing the features of our new smartphone"
4. Set parameters:
   - Duration: 30 seconds
   - Style: Product
   - Platforms: YouTube, LinkedIn
   - Video Quality: Standard
5. Proceed to Generate step
6. **Expected Results:**
   - Video Type: `product`
   - Model: `veo-3.1-generate-001`
   - Reasoning: "Premium content requires high quality"
   - Est. Cost: ~$0.240-0.360
   - Est. Time: ~3-5 minutes

### Scenario 3: Tutorial Video (Conditional Model Selection)
**Objective:** Verify quality-based model selection for tutorials

**Test Steps:**
1. Navigate to `/videos`
2. Enter input: "Create a step-by-step tutorial on how to use our software"
3. Set parameters:
   - Duration: 45 seconds
   - Style: Narrative
   - Platforms: YouTube
   - Video Quality: Standard (high quality)
4. **Expected Results:**
   - Video Type: `tutorial`
   - Model: `veo-3.1-generate-001`
   - Reasoning: "Tutorial with high quality requirement"

### Scenario 4: Ad Campaign (Premium Quality)
**Objective:** Verify ad content uses premium model

**Test Steps:**
1. Enter input: "Create a compelling advertisement for our holiday sale campaign"
2. Set parameters:
   - Duration: 20 seconds
   - Style: Viral
   - Platforms: Facebook, Instagram, YouTube
   - Video Quality: Standard
3. **Expected Results:**
   - Video Type: `ad`
   - Model: `veo-3.1-generate-001`
   - Reasoning: "Premium content (product/ad/demo) - high quality"

---

## Verification Checklist

### Frontend Verification
- [ ] Video type detection displays correct category badge
- [ ] Model selection card shows reasoning
- [ ] Cost estimate matches model pricing
- [ ] Time estimate reflects model speed
- [ ] Model badge displays correctly (Premium/Fast/Preview)
- [ ] Progress messages mention VEO 3.1

### Backend Verification (Check Logs)
- [ ] Model selection logic executes
- [ ] Correct model parameters passed to generateVideoClips
- [ ] Video clips generated with selected model
- [ ] Cost calculation uses model-specific pricing
- [ ] Retry logic activates on errors
- [ ] Fallback to fast model on failures

### Database Verification (Check Tables)
```sql
-- Verify ai_model_usage tracking
SELECT 
  model_family,
  model_version,
  selection_reason,
  cost_estimate,
  generation_time_ms,
  success,
  metadata
FROM ai_model_usage
WHERE service = 'video'
ORDER BY created_at DESC
LIMIT 5;

-- Verify video_generations metadata
SELECT 
  id,
  veo_model_used,
  cost_usd,
  generation_time_seconds,
  status,
  metadata
FROM video_generations
ORDER BY created_at DESC
LIMIT 5;
```

### Edge Function Logs Verification
Check: `https://supabase.com/dashboard/project/apxigjramwlzjifjesph/functions/generate-video-story-automated/logs`

Look for:
- ✅ "VEO 3.1 Parameters:" log entry
- ✅ Model selection reasoning
- ✅ "Selected {model}: {reasoning}" messages
- ✅ "Generated X clips in Xs" with performance metrics
- ✅ "Model usage tracked successfully"
- ⚠️ Any error messages or fallback triggers

---

## Success Metrics

### Performance Metrics
- **Fast Model (veo-3.1-fast-generate-001)**
  - Generation time: 60-90 seconds per clip
  - Cost per 5s clip: ~$0.04
  - Success rate: >95%

- **Standard Model (veo-3.1-generate-001)**
  - Generation time: 120-180 seconds per clip
  - Cost per 5s clip: ~$0.12
  - Success rate: >95%

### Quality Metrics
- Video type detection accuracy: >90%
- Model selection appropriateness: Manual review
- Cost estimates within 10% of actual
- Time estimates within 20% of actual

---

## Error Scenarios to Test

### 1. Rate Limit Handling
- Generate 3+ videos in rapid succession
- Verify queue management
- Check retry logic in logs

### 2. Model Fallback
- Simulate primary model failure (if possible)
- Verify fallback to fast model
- Confirm error tracking in ai_model_usage

### 3. Network Issues
- Monitor behavior on temporary network failures
- Verify retry count tracking
- Check exponential backoff implementation

---

## Post-Test Actions

### If Tests Pass
1. ✅ Document successful test results
2. ✅ Create baseline performance metrics
3. ✅ Set up monitoring alerts
4. ✅ Enable for production users

### If Tests Fail
1. ❌ Capture detailed error logs
2. ❌ Document failure scenarios
3. ❌ Review model selection logic
4. ❌ Check Vertex AI API responses
5. ❌ Verify VERTEX_AI_CREDENTIALS configuration

---

## Monitoring Dashboard Queries

### Real-Time Model Usage
```sql
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  model_version,
  COUNT(*) as count,
  AVG(cost_estimate) as avg_cost,
  AVG(generation_time_ms) as avg_time,
  SUM(CASE WHEN success THEN 1 ELSE 0 END)::float / COUNT(*) * 100 as success_rate
FROM ai_model_usage
WHERE service = 'video'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour, model_version
ORDER BY hour DESC, model_version;
```

### Cost Analysis by Video Type
```sql
SELECT 
  metadata->>'videoType' as video_type,
  model_version,
  COUNT(*) as video_count,
  SUM(cost_estimate) as total_cost,
  AVG(cost_estimate) as avg_cost_per_video
FROM ai_model_usage
WHERE service = 'video'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY video_type, model_version
ORDER BY total_cost DESC;
```

---

## Next Steps

1. **Execute Test Scenarios** - Run through all 4 test scenarios
2. **Review Logs** - Check edge function logs for proper execution
3. **Verify Database** - Confirm ai_model_usage entries
4. **Performance Analysis** - Compare actual vs. estimated metrics
5. **Documentation** - Update with test results and learnings
