# VEO 3.1 API Documentation

## Overview

VEO 3.1 is Google's latest video generation model family, available through Vertex AI. This documentation covers all three model variants and their capabilities.

## Model Variants

### 1. veo-3.1-generate-001 (Standard Model)
- **Purpose**: High-quality video generation for production use
- **Quality**: Highest quality output
- **Speed**: Slower generation time (~2-3 minutes per video)
- **Cost**: Higher cost per generation
- **Use Cases**: Marketing videos, product demos, commercial content

### 2. veo-3.1-fast-generate-001 (Fast Model)
- **Purpose**: Rapid video generation for prototyping and high-volume needs
- **Quality**: Good quality output
- **Speed**: Faster generation time (~1-1.5 minutes per video)
- **Cost**: Lower cost per generation
- **Use Cases**: Social media content, A/B testing, rapid iteration

### 3. veo-3.1-generate-preview (Preview Model)
- **Purpose**: Advanced features and experimental capabilities
- **Quality**: Highest quality with additional features
- **Speed**: Variable (similar to standard model)
- **Cost**: Similar to standard model
- **Use Cases**: Image-to-video, video extension, advanced transformations
- **Special Features**:
  - Reference image support (image-to-video)
  - Video extension (extend existing videos)
  - First frame/last frame control

## API Endpoints

### Base URL
```
https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/publishers/google/models/{MODEL_ID}:generateVideo
```

### Authentication
- Uses OAuth 2.0 with Vertex AI service account credentials
- Token expires after 1 hour
- Required scope: `https://www.googleapis.com/auth/cloud-platform`

## Request Format

### Standard/Fast Model Request

```json
{
  "instances": [
    {
      "prompt": "A professional chef preparing a gourmet meal in a modern kitchen",
      "aspectRatio": "16:9",
      "stylePreset": "cinematic",
      "negativePrompt": "blurry, low quality, distorted"
    }
  ],
  "parameters": {
    "sampleCount": 1,
    "seed": 12345
  }
}
```

### Preview Model Request (Image-to-Video)

```json
{
  "instances": [
    {
      "prompt": "The product slowly rotates, showing all angles",
      "aspectRatio": "9:16",
      "referenceImages": [
        {
          "bytesBase64Encoded": "base64_encoded_image_data",
          "imageMetadata": {
            "gcsUri": "gs://bucket/image.jpg",
            "mimeType": "image/jpeg"
          }
        }
      ]
    }
  ]
}
```

### Preview Model Request (Video Extension)

```json
{
  "instances": [
    {
      "prompt": "Continue the motion smoothly, maintaining the same style",
      "baseVideoUri": "gs://bucket/existing-video.mp4",
      "firstFrame": {
        "bytesBase64Encoded": "base64_first_frame"
      },
      "lastFrame": {
        "bytesBase64Encoded": "base64_last_frame"
      }
    }
  ]
}
```

## Parameters

### Required Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `prompt` | string | Text description of desired video | "A sunset over the ocean" |
| `aspectRatio` | string | Video aspect ratio | "16:9", "9:16", "1:1" |

### Optional Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `stylePreset` | string | Visual style guidance | "cinematic", "documentary", "animated" |
| `negativePrompt` | string | Elements to avoid | "" |
| `seed` | integer | Reproducibility seed | Random |
| `sampleCount` | integer | Number of variations | 1 |
| `durationSeconds` | integer | Video length (3-60s) | 5 |

### Preview Model Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `referenceImages` | array | Images for image-to-video |
| `baseVideoUri` | string | Existing video for extension |
| `firstFrame` | object | Starting frame control |
| `lastFrame` | object | Ending frame control |

## Response Format

### Success Response

```json
{
  "name": "projects/PROJECT_ID/locations/LOCATION/operations/OPERATION_ID",
  "metadata": {
    "@type": "type.googleapis.com/google.cloud.aiplatform.v1.CreateVideoPredictionOperationMetadata",
    "genericMetadata": {
      "createTime": "2025-01-15T10:30:00Z",
      "updateTime": "2025-01-15T10:30:05Z"
    }
  }
}
```

### Polling Operation Status

**Endpoint**: 
```
GET https://{LOCATION}-aiplatform.googleapis.com/v1/{OPERATION_NAME}
```

**In Progress Response**:
```json
{
  "name": "operations/OPERATION_ID",
  "metadata": {
    "genericMetadata": {
      "updateTime": "2025-01-15T10:31:00Z"
    }
  },
  "done": false
}
```

**Completed Response**:
```json
{
  "name": "operations/OPERATION_ID",
  "metadata": {
    "genericMetadata": {
      "updateTime": "2025-01-15T10:32:00Z"
    }
  },
  "done": true,
  "response": {
    "@type": "type.googleapis.com/google.cloud.aiplatform.v1.GenerateVideoResponse",
    "generatedSamples": [
      {
        "video": {
          "uri": "gs://bucket/generated-video.mp4"
        }
      }
    ]
  }
}
```

## Supported Configurations

### Aspect Ratios
- **16:9** (Landscape): YouTube, website banners, presentations
- **9:16** (Portrait): Instagram Stories, TikTok, mobile-first content
- **1:1** (Square): Instagram posts, Facebook feeds, LinkedIn

### Duration
- **Minimum**: 3 seconds
- **Maximum**: 60 seconds
- **Recommended**: 5-15 seconds for optimal quality

### Resolution
- Automatically determined based on aspect ratio
- Standard Model: Up to 1080p
- Fast Model: Up to 720p
- Preview Model: Up to 1080p

## Rate Limits

### Default Quotas
- **Standard Model**: 60 requests per minute
- **Fast Model**: 120 requests per minute
- **Preview Model**: 30 requests per minute

### Error Codes
- **429**: Rate limit exceeded (retry with exponential backoff)
- **400**: Invalid request (check parameters)
- **401**: Authentication failed (refresh token)
- **403**: Permission denied (check service account roles)
- **404**: Model not found (check model ID and location)
- **500**: Internal server error (retry)

## Best Practices

### Prompt Engineering
1. **Be Specific**: Include details about camera movement, lighting, mood
2. **Use Action Verbs**: "rotates", "zooms", "pans", "reveals"
3. **Specify Style**: "cinematic", "documentary-style", "animated"
4. **Add Context**: Setting, time of day, weather conditions
5. **Use Negative Prompts**: Exclude unwanted elements

### Performance Optimization
1. **Use Fast Model**: For social media and high-volume generation
2. **Batch Requests**: Queue and process multiple videos efficiently
3. **Cache Results**: Store generated videos to avoid regeneration
4. **Monitor Costs**: Track usage and optimize model selection
5. **Implement Retry Logic**: Handle transient failures gracefully

### Error Handling
1. **Exponential Backoff**: For rate limit errors (429)
2. **Token Refresh**: Check expiration before requests
3. **Validate Input**: Check aspect ratio and duration before API calls
4. **Fallback Models**: Try fast model if standard fails
5. **Log Errors**: Capture detailed error information for debugging

## Cost Estimation

### Pricing (Approximate)
- **Standard Model**: $0.12 per video (5s)
- **Fast Model**: $0.04 per video (5s)
- **Preview Model**: $0.15 per video (5s, with advanced features)

### Cost Calculation Formula
```
cost = baseRate * (duration / 5) * modelMultiplier
```

## Code Examples

See `VEO_3.1_CODE_EXAMPLES.md` for detailed implementation examples.

## Troubleshooting

See `VEO_3.1_TROUBLESHOOTING_GUIDE.md` for common issues and solutions.

## Additional Resources

- [Vertex AI Video Generation Documentation](https://cloud.google.com/vertex-ai/docs/generative-ai/video/generate-videos)
- [VEO Model Card](https://cloud.google.com/vertex-ai/docs/generative-ai/model-reference/veo)
- [API Reference](https://cloud.google.com/vertex-ai/docs/reference)
