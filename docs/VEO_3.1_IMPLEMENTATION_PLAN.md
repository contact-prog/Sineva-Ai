# VEO 3.1 Implementation Plan for Sineva AI

## Overview

This document outlines the complete implementation plan to integrate VEO 3.1 models into the Sineva AI video generation service. The plan is divided into phases to ensure systematic and testable implementation.

## Prerequisites

- [ ] Access to VEO 3.1 models in Vertex AI
- [ ] Valid Vertex AI credentials configured
- [ ] Existing video generation infrastructure functional
- [ ] Database schema supports new metadata fields

## Implementation Phases

### Phase 1: Core Infrastructure Setup (Day 1)

**Objective**: Set up foundational classes and utilities for VEO 3.1 integration

#### Tasks

1. **Create VEO Model Selector**
   - File: `supabase/functions/_shared/veo-model-selector.ts`
   - Implement `VeoModelSelector` class with decision tree logic
   - Add model selection based on context (video type, quality, user tier)
   - Test: Unit tests for all decision branches

2. **Create VEO Request Queue**
   - File: `supabase/functions/_shared/veo-request-queue.ts`
   - Implement `VeoRequestQueue` class for rate limit management
   - Add queue processing with configurable intervals
   - Test: Queue handles concurrent requests correctly

3. **Create Error Handlers**
   - File: `supabase/functions/_shared/veo-error-handlers.ts`
   - Implement `generateWithRetry` for exponential backoff
   - Implement `generateWithFallback` for model fallback
   - Test: Retry logic works with simulated rate limits

#### Acceptance Criteria
- [ ] All three utility classes created and functional
- [ ] Unit tests pass for model selection logic
- [ ] Queue correctly rate-limits requests
- [ ] Retry logic handles 429 errors with exponential backoff
- [ ] Fallback successfully tries alternate models

#### Estimated Time: 4-6 hours

---

### Phase 2: Update Video Clip Generator (Day 1-2)

**Objective**: Integrate VEO 3.1 models into existing video clip generation

#### Tasks

1. **Update GenerateVideoClipsParams Interface**
   - Add new parameters: `videoType`, `qualityRequirement`, `userTier`, `urgency`, `enablePreviewFeatures`
   - Update all call sites to include new parameters

2. **Refactor generateVideoClips Function**
   - Integrate `VeoModelSelector` for dynamic model selection
   - Use `VeoRequestQueue` for all API calls
   - Wrap generation calls with `generateWithRetry`
   - Add detailed logging for model selection and costs

3. **Update generateSingleVideoClip Function**
   - Support all three VEO 3.1 models
   - Add reference image support for Preview Model
   - Update prompt construction for better results
   - Improve error handling and logging

4. **Update pollVeoOperation Function**
   - Add timeout handling
   - Improve error messages
   - Add progress logging

5. **Update calculateVeoCost Function**
   - Add pricing for all three models
   - Support variable duration

#### Acceptance Criteria
- [ ] Video clips generate successfully with all three models
- [ ] Model selection follows decision tree logic
- [ ] Rate limiting prevents 429 errors
- [ ] Costs are calculated correctly for each model
- [ ] Detailed logs show model selection reasoning
- [ ] Preview Model works with reference images (if enabled)

#### Estimated Time: 6-8 hours

---

### Phase 3: Update Edge Function (Day 2)

**Objective**: Update the main video generation edge function to pass new parameters

#### Tasks

1. **Update generate-video-story-automated Function**
   - Extract video type from user prompt/story
   - Determine quality requirement based on user settings
   - Pass user tier from profile
   - Call `generateVideoClips` with all new parameters

2. **Add Detailed Metrics Logging**
   - Log total cost
   - Log average generation time per clip
   - Log models used
   - Log retry counts
   - Save metrics to `ai_model_usage` table

3. **Update Error Handling**
   - Catch VEO-specific errors
   - Provide helpful error messages
   - Log errors with full context

#### Acceptance Criteria
- [ ] Edge function successfully calls updated `generateVideoClips`
- [ ] Video type is correctly detected from user input
- [ ] Quality requirement is determined from user settings
- [ ] Metrics are logged to database
- [ ] Error messages are clear and actionable

#### Estimated Time: 3-4 hours

---

### Phase 4: Update Frontend (Day 2-3)

**Objective**: Update frontend components to support new features and provide feedback

#### Tasks

1. **Update StoryGenerateStep Component**
   - Add video type detection logic
   - Pass new parameters to edge function
   - Display model selection reasoning (optional)
   - Show estimated cost and time

2. **Add Model Selection UI (Optional)**
   - Allow users to choose quality level
   - Show cost implications of quality choice
   - Display estimated generation time

3. **Enhance Progress Feedback**
   - Show more detailed status messages
   - Display cost as generation progresses
   - Show which model is being used

#### Acceptance Criteria
- [ ] Frontend correctly detects video type
- [ ] New parameters are passed to backend
- [ ] Users see clear progress updates
- [ ] Cost estimates are displayed
- [ ] Quality selection UI works (if implemented)

#### Estimated Time: 4-6 hours

---

### Phase 5: Testing and Validation (Day 3)

**Objective**: Comprehensive testing of all components

#### Tasks

1. **Unit Tests**
   - Test `VeoModelSelector` with all scenarios
   - Test `VeoRequestQueue` with concurrent requests
   - Test `generateWithRetry` with simulated errors
   - Test `generateWithFallback` with model failures

2. **Integration Tests**
   - Test full video generation flow
   - Test with all three VEO models
   - Test rate limit handling
   - Test fallback mechanisms
   - Test cost calculation

3. **End-to-End Tests**
   - Generate videos of different types
   - Test with different user tiers
   - Test with different quality requirements
   - Verify metrics are logged correctly

4. **Performance Tests**
   - Test batch generation
   - Test concurrent requests
   - Measure generation times
   - Verify rate limiting works

#### Acceptance Criteria
- [ ] All unit tests pass
- [ ] Integration tests cover main scenarios
- [ ] E2E tests validate full user flow
- [ ] Performance meets expectations
- [ ] No rate limit violations
- [ ] Costs are accurate

#### Estimated Time: 6-8 hours

---

### Phase 6: Monitoring and Optimization (Day 4)

**Objective**: Set up monitoring and optimize based on real usage

#### Tasks

1. **Set Up Monitoring**
   - Create dashboard for video generation metrics
   - Add alerts for high error rates
   - Monitor cost trends
   - Track model usage distribution

2. **Analyze Initial Usage**
   - Review model selection decisions
   - Check cost efficiency
   - Measure generation times
   - Identify bottlenecks

3. **Optimize**
   - Adjust model selection logic if needed
   - Fine-tune queue parameters
   - Optimize prompt construction
   - Improve error handling

4. **Documentation**
   - Update user documentation
   - Create troubleshooting guide
   - Document model selection logic
   - Add cost estimation guide

#### Acceptance Criteria
- [ ] Monitoring dashboard is functional
- [ ] Alerts are configured and working
- [ ] Initial usage patterns are analyzed
- [ ] Optimizations are identified and implemented
- [ ] Documentation is complete and accurate

#### Estimated Time: 4-6 hours

---

## Rollout Strategy

### Option 1: Gradual Rollout (Recommended)

1. **Phase 1 (10% of users)**: Enable VEO 3.1 for 10% of users
   - Monitor for issues
   - Collect feedback
   - Measure performance

2. **Phase 2 (30% of users)**: Expand to 30% if Phase 1 is successful
   - Continue monitoring
   - Address any issues
   - Refine model selection

3. **Phase 3 (100% of users)**: Full rollout
   - Monitor closely for first 48 hours
   - Be prepared to rollback if needed

### Option 2: Feature Flag

- Add `VEO_31_ENABLED` environment variable
- Set to `true` to enable VEO 3.1
- Set to `false` to fallback to previous implementation
- Can be toggled without code changes

### Option 3: User Tier Based

- **Free users**: Continue with current implementation
- **Pro users**: Enable VEO 3.1 with Fast Model
- **Enterprise users**: Enable VEO 3.1 with Standard Model

## Risk Mitigation

### Potential Risks and Mitigations

1. **Rate Limiting**
   - **Risk**: Exceeding VEO 3.1 rate limits
   - **Mitigation**: Implement request queue with proper delays

2. **Cost Overruns**
   - **Risk**: Higher costs than expected
   - **Mitigation**: Set budget alerts, use Fast Model by default

3. **Quality Issues**
   - **Risk**: VEO 3.1 output doesn't meet expectations
   - **Mitigation**: Fallback mechanism to previous models

4. **Performance Degradation**
   - **Risk**: Slower generation times
   - **Mitigation**: Use Fast Model for time-sensitive content

5. **Integration Issues**
   - **Risk**: Breaking existing functionality
   - **Mitigation**: Comprehensive testing, gradual rollout

## Success Metrics

- [ ] Video generation success rate >95%
- [ ] Average generation time <2 minutes per clip
- [ ] Cost per video within budget (<$0.08 per 5s video average)
- [ ] Rate limit errors <1%
- [ ] User satisfaction score maintained or improved

## Total Estimated Time

- **Phase 1**: 4-6 hours
- **Phase 2**: 6-8 hours
- **Phase 3**: 3-4 hours
- **Phase 4**: 4-6 hours
- **Phase 5**: 6-8 hours
- **Phase 6**: 4-6 hours

**Total**: 27-38 hours (approximately 4-5 working days)

## Next Steps

1. Review and approve this implementation plan
2. Set up development environment
3. Begin Phase 1: Core Infrastructure Setup
4. Execute phases sequentially with checkpoints
5. Deploy to production with chosen rollout strategy
6. Monitor and optimize post-deployment

## Resources

- [VEO 3.1 API Documentation](./VEO_3.1_API_DOCUMENTATION.md)
- [VEO 3.1 Model Comparison Guide](./VEO_3.1_MODEL_COMPARISON_GUIDE.md)
- [VEO 3.1 Migration Guide](./VEO_3.1_MIGRATION_GUIDE.md)
- [VEO 3.1 Troubleshooting Guide](./VEO_3.1_TROUBLESHOOTING_GUIDE.md)
- [VEO 3.1 Code Examples](./VEO_3.1_CODE_EXAMPLES.md)
- [VEO 3.1 Model Selection Decision Tree](./VEO_3.1_MODEL_SELECTION_DECISION_TREE.md)
- [VEO 3.1 Implementation Patterns](./VEO_3.1_IMPLEMENTATION_PATTERNS.md)
