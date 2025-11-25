# VEO 3.1 Model Comparison Guide

## Quick Reference Table

| Feature | Standard Model | Fast Model | Preview Model |
|---------|---------------|------------|---------------|
| **Model ID** | `veo-3.1-generate-001` | `veo-3.1-fast-generate-001` | `veo-3.1-generate-preview` |
| **Quality** | ⭐⭐⭐⭐⭐ Highest | ⭐⭐⭐⭐ High | ⭐⭐⭐⭐⭐ Highest + Features |
| **Speed** | 🐢 2-3 min | 🚀 1-1.5 min | 🐢 2-3 min |
| **Cost** | 💰💰💰 $0.12/video | 💰 $0.04/video | 💰💰💰💰 $0.15/video |
| **Use Cases** | Production, Marketing | Social Media, Testing | Advanced Features |
| **Image-to-Video** | ❌ No | ❌ No | ✅ Yes |
| **Video Extension** | ❌ No | ❌ No | ✅ Yes |
| **Frame Control** | ❌ No | ❌ No | ✅ Yes |
| **Availability** | GA | GA | Preview |

## Detailed Comparison

### 1. Quality Comparison

#### Standard Model (veo-3.1-generate-001)
- **Resolution**: Up to 1080p
- **Detail Level**: Highest detail and realism
- **Consistency**: Best temporal consistency
- **Motion**: Smoothest motion and transitions
- **Artifacts**: Minimal artifacts or distortions
- **Best For**: Final production content, client deliverables, marketing campaigns

#### Fast Model (veo-3.1-fast-generate-001)
- **Resolution**: Up to 720p
- **Detail Level**: High detail, slightly less refined
- **Consistency**: Good temporal consistency
- **Motion**: Good motion, occasional minor stutters
- **Artifacts**: Rare minor artifacts
- **Best For**: Social media, A/B testing, rapid prototyping

#### Preview Model (veo-3.1-generate-preview)
- **Resolution**: Up to 1080p
- **Detail Level**: Highest detail with advanced features
- **Consistency**: Best consistency with reference images
- **Motion**: Smoothest with frame control
- **Artifacts**: Minimal, but experimental features may vary
- **Best For**: Image-to-video, video extension, advanced transformations

### 2. Speed Comparison

#### Generation Time Benchmarks (5-second video)
- **Standard Model**: 120-180 seconds (2-3 minutes)
- **Fast Model**: 60-90 seconds (1-1.5 minutes)
- **Preview Model**: 120-180 seconds (2-3 minutes, varies with features)

#### Factors Affecting Speed
1. **Video Duration**: Longer videos take proportionally more time
2. **Complexity**: Detailed prompts may increase processing time
3. **Queue Position**: Wait time depends on current load
4. **Features Used**: Preview features (image-to-video) may add time

### 3. Cost Comparison

#### Base Pricing (5-second video)
- **Standard Model**: $0.12 per video
- **Fast Model**: $0.04 per video (66% savings vs. Standard)
- **Preview Model**: $0.15 per video (25% premium vs. Standard)

#### Cost at Scale (100 videos, 5 seconds each)
- **Standard Model**: $12.00
- **Fast Model**: $4.00 (save $8.00)
- **Preview Model**: $15.00

#### Duration-Based Pricing
```
10-second video costs = 2× base price
15-second video costs = 3× base price
30-second video costs = 6× base price
60-second video costs = 12× base price
```

### 4. Feature Comparison

#### Standard Model Features
✅ Text-to-video generation
✅ All aspect ratios (16:9, 9:16, 1:1)
✅ Style presets (cinematic, documentary, animated)
✅ Negative prompts
✅ Seed control for reproducibility
✅ Duration control (3-60 seconds)

❌ Image-to-video
❌ Video extension
❌ First/last frame control

#### Fast Model Features
✅ Text-to-video generation
✅ All aspect ratios (16:9, 9:16, 1:1)
✅ Style presets
✅ Negative prompts
✅ Seed control
✅ Duration control (3-60 seconds)

❌ Image-to-video
❌ Video extension
❌ First/last frame control

#### Preview Model Features
✅ All Standard Model features
✅ **Image-to-video** (animate static images)
✅ **Video extension** (extend existing videos)
✅ **First frame control** (specify starting frame)
✅ **Last frame control** (specify ending frame)
✅ Advanced reference image support

⚠️ Experimental features may change
⚠️ May have different rate limits

### 5. Use Case Recommendations

#### Use Standard Model When:
- Creating final production content
- Quality is the top priority
- Client deliverables require highest standards
- Marketing campaigns and advertisements
- Brand videos and corporate content
- Budget allows for premium quality

#### Use Fast Model When:
- Generating social media content
- Creating multiple variations for A/B testing
- Rapid prototyping and iteration
- High-volume content needs
- Budget is constrained
- Speed is more important than marginal quality gains

#### Use Preview Model When:
- Animating existing product images
- Extending or modifying existing videos
- Need precise control over first/last frames
- Experimenting with advanced features
- Creating image-to-video transformations
- Budget allows for experimental features

### 6. Quality vs. Speed vs. Cost Trade-offs

#### Priority: Quality First
1. **Best Choice**: Standard Model
2. **Alternative**: Preview Model (if advanced features needed)
3. **Avoid**: Fast Model

#### Priority: Speed First
1. **Best Choice**: Fast Model
2. **Alternative**: Standard Model (if quality gap is too large)
3. **Consider**: Preview Model only if features are essential

#### Priority: Cost First
1. **Best Choice**: Fast Model
2. **Alternative**: Standard Model (for critical content only)
3. **Avoid**: Preview Model

#### Balanced Approach
- **High-value content**: Standard Model
- **High-volume content**: Fast Model
- **Special features**: Preview Model
- **Testing and iteration**: Fast Model → Standard Model for finals

### 7. Performance Metrics

#### Quality Metrics (Subjective Scale 1-10)
| Metric | Standard | Fast | Preview |
|--------|----------|------|---------|
| Visual Detail | 10 | 8 | 10 |
| Motion Smoothness | 10 | 7 | 10 |
| Temporal Consistency | 10 | 8 | 10 |
| Artifact Reduction | 10 | 8 | 9 |
| Overall Quality | 10 | 8 | 10 |

#### Efficiency Metrics
| Metric | Standard | Fast | Preview |
|--------|----------|------|---------|
| Generation Speed | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| Cost Efficiency | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| Quality per Dollar | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Versatility | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

### 8. Model Selection Decision Tree

```
Start
  │
  ├─ Need image-to-video or video extension?
  │   └─ YES → Preview Model
  │   └─ NO → Continue
  │
  ├─ Is this for final production/client delivery?
  │   └─ YES → Standard Model
  │   └─ NO → Continue
  │
  ├─ Need to generate 10+ variations quickly?
  │   └─ YES → Fast Model
  │   └─ NO → Continue
  │
  ├─ Is budget very constrained?
  │   └─ YES → Fast Model
  │   └─ NO → Standard Model
```

### 9. Migration Recommendations

#### From Older VEO Models

**From VEO 2.0 to VEO 3.1**:
- **Quality Improvement**: ~30% better visual quality
- **Speed Improvement**: ~20% faster generation
- **New Features**: Preview model features not in VEO 2.0
- **Cost**: Similar pricing structure
- **Migration Path**: Update model ID, test prompts, deploy

**Key Changes**:
- Improved prompt understanding
- Better motion consistency
- Enhanced style control
- More reliable results

### 10. Best Practices for Each Model

#### Standard Model Best Practices
1. Use for all customer-facing content
2. Invest time in prompt refinement
3. Generate fewer, higher-quality videos
4. Use for brand-critical content
5. Test with Fast Model, finalize with Standard

#### Fast Model Best Practices
1. Perfect for social media content
2. Generate multiple variations quickly
3. Use for A/B testing different concepts
4. Ideal for daily content needs
5. Prioritize volume over perfection

#### Preview Model Best Practices
1. Experiment with advanced features carefully
2. Test image quality before image-to-video
3. Use for unique use cases only
4. Monitor costs closely (experimental features)
5. Have fallback plan to Standard Model

## Summary Recommendation

**General Rule of Thumb**:
- **80% of content**: Fast Model (speed + cost efficiency)
- **15% of content**: Standard Model (high-value, final production)
- **5% of content**: Preview Model (special features, experimentation)

**Adjust based on**:
- Your quality requirements
- Budget constraints
- Production timeline
- Content volume needs
