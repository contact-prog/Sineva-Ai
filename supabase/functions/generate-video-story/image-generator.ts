import { Scene } from './scene-planner.ts';

export interface SceneImage {
  sceneNumber: number;
  imageUrl: string;
  base64Data: string;
}

interface GenerateSceneImagesParams {
  scenes: Scene[];
  style: string;
  vertexToken: string;
  projectId: string;
}

export async function generateSceneImages(params: GenerateSceneImagesParams): Promise<SceneImage[]> {
  const { scenes, style, vertexToken, projectId } = params;

  const sceneImages: SceneImage[] = [];

  // Style-specific prompt enhancements
  const stylePrompts: Record<string, string> = {
    narrative: 'cinematic, emotional, story-driven composition, dramatic lighting',
    viral: 'vibrant colors, dynamic composition, eye-catching, social media optimized',
    music: 'artistic, creative, rhythm-based visual flow, bold colors',
    product: 'professional, clean, modern, commercial photography style'
  };

  const styleEnhancement = stylePrompts[style] || stylePrompts.narrative;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    console.log(`Generating image for scene ${scene.sceneNumber}/${scenes.length}...`);

    try {
      const enhancedPrompt = `${scene.visualDescription}. ${styleEnhancement}. Mood: ${scene.mood}. High quality, professional, 4K resolution.`;

      const imageData = await generateSingleImage(enhancedPrompt, vertexToken, projectId);
      
      sceneImages.push({
        sceneNumber: scene.sceneNumber,
        imageUrl: '', // Will be set after upload
        base64Data: imageData
      });

      // Small delay to avoid rate limits
      if (i < scenes.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error: any) {
      console.error(`Failed to generate image for scene ${scene.sceneNumber}:`, error);
      
      // If rate limited, wait longer
      if (error.message?.includes('429')) {
        console.log('Rate limited, waiting 10 seconds...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        i--; // Retry this scene
        continue;
      }
      
      throw error;
    }
  }

  return sceneImages;
}

async function generateSingleImage(prompt: string, vertexToken: string, projectId: string): Promise<string> {
  const endpoint = `https://aiplatform.googleapis.com/v1/projects/${projectId}/locations/global/publishers/google/models/gemini-3-pro-image-preview:generateContent`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${vertexToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.9,
        topP: 0.95,
        topK: 40,
        candidateCount: 1,
        responseModalities: ["image"]
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Image generation API error:', error);
    throw new Error(`Image generation failed: ${response.status}`);
  }

  const data = await response.json();
  
  // Extract base64 image
  const imagePart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));
  
  if (!imagePart?.inlineData?.data) {
    throw new Error('No image data in response');
  }

  return imagePart.inlineData.data;
}
