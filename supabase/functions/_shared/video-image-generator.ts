import { Scene } from './video-scene-planner.ts';

export interface SceneImage {
  sceneNumber: number;
  imageUrl: string;
  base64Data: string;
}

export interface GenerateSceneImagesParams {
  scenes: Scene[];
  style: string;
  vertexToken: string;
  projectId: string;
  onSceneComplete?: (sceneNumber: number, imageData: string) => Promise<void>;
}

export async function generateSceneImages(params: GenerateSceneImagesParams): Promise<SceneImage[]> {
  const { scenes, style, vertexToken, projectId, onSceneComplete } = params;

  // Style-specific prompt enhancements
  const stylePrompts: Record<string, string> = {
    narrative: 'cinematic, emotional, story-driven, dramatic lighting',
    viral: 'vibrant colors, dynamic, eye-catching',
    music: 'artistic, creative, bold colors',
    product: 'professional, clean, modern'
  };

  const styleEnhancement = stylePrompts[style] || stylePrompts.narrative;

  // STEP 1: Generate first scene image (establishes character design)
  console.log('Generating first scene image (reference for character consistency)...');
  const firstScene = scenes[0];
  const firstScenePrompt = `IMPORTANT: Create a consistent, memorable character design. ${firstScene.visualDescription}. ${styleEnhancement}. Mood: ${firstScene.mood}. CRITICAL: This character design will be used as reference for all subsequent scenes. Photorealistic, 4K quality, cinematic composition, detailed character features.`;
  
  const firstImageData = await generateSingleImage(firstScenePrompt, vertexToken, projectId);
  
  const sceneImages: SceneImage[] = [{
    sceneNumber: firstScene.sceneNumber,
    imageUrl: '',
    base64Data: firstImageData
  }];

  console.log('✓ First scene image generated (will be used as reference)');
  
  // Notify immediately after first scene
  if (onSceneComplete) {
    await onSceneComplete(firstScene.sceneNumber, firstImageData);
  }

  // STEP 2: Generate remaining scenes in parallel with reference image
  if (scenes.length > 1) {
    console.log(`Generating ${scenes.length - 1} remaining scenes in parallel with reference image...`);
    
    const remainingScenes = scenes.slice(1);
    const batchSize = 3; // Process 3 at a time to avoid overwhelming the API
    
    for (let batchStart = 0; batchStart < remainingScenes.length; batchStart += batchSize) {
      const batch = remainingScenes.slice(batchStart, batchStart + batchSize);
      console.log(`Processing batch ${Math.floor(batchStart / batchSize) + 1}/${Math.ceil(remainingScenes.length / batchSize)}...`);
      
      const batchPromises = batch.map(async (scene) => {
        const characterConstraint = `CRITICAL CHARACTER CONSISTENCY: Use the reference image to maintain EXACT same character appearance - identical face, clothing, physical features, style. NO variations.`;
        const enhancedPrompt = `${characterConstraint} ${scene.visualDescription}. ${styleEnhancement}. Mood: ${scene.mood}. Match the character from the reference image exactly. Photorealistic, consistent style.`;
        
        try {
          const imageData = await generateSingleImage(enhancedPrompt, vertexToken, projectId, firstImageData);
          
          console.log(`✓ Scene ${scene.sceneNumber} image generated`);
          
          // Notify immediately after generating
          if (onSceneComplete) {
            await onSceneComplete(scene.sceneNumber, imageData);
          }
          
          return {
            sceneNumber: scene.sceneNumber,
            imageUrl: '',
            base64Data: imageData
          };
        } catch (error: any) {
          console.error(`Failed to generate image for scene ${scene.sceneNumber}:`, error);
          
          // Retry with exponential backoff for rate limits
          if (error.message?.includes('429') || error.message?.includes('quota')) {
            const waitTime = 10000;
            console.log(`Rate limited on scene ${scene.sceneNumber}, waiting ${waitTime / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            
            // Retry once
            const imageData = await generateSingleImage(enhancedPrompt, vertexToken, projectId, firstImageData);
            console.log(`✓ Scene ${scene.sceneNumber} image generated (retry)`);
            
            // Notify after retry success
            if (onSceneComplete) {
              await onSceneComplete(scene.sceneNumber, imageData);
            }
            
            return {
              sceneNumber: scene.sceneNumber,
              imageUrl: '',
              base64Data: imageData
            };
          }
          
          throw error;
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          sceneImages.push(result.value);
        } else {
          console.error(`Scene ${batch[idx].sceneNumber} failed:`, result.reason);
          throw new Error(`Failed to generate image for scene ${batch[idx].sceneNumber}: ${result.reason.message}`);
        }
      });

      // Small delay between batches
      if (batchStart + batchSize < remainingScenes.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // Sort by scene number to maintain order
  sceneImages.sort((a, b) => a.sceneNumber - b.sceneNumber);
  
  console.log(`Successfully generated ${sceneImages.length} scene images with character consistency`);
  return sceneImages;
}

async function generateSingleImage(prompt: string, vertexToken: string, projectId: string, referenceImage?: string): Promise<string> {
  const models = [
    { id: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image (primary)' },
    { id: 'gemini-3-pro-image-preview', label: 'Gemini 3 Pro Image (fallback)' },
  ];

  let lastErrorText = '';

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const endpoint = `https://aiplatform.googleapis.com/v1/projects/${projectId}/locations/global/publishers/google/models/${model.id}:generateContent`;

    console.log(`[Vertex AI] Calling ${model.label} with prompt:`, prompt.substring(0, 120) + '...');
    if (referenceImage) {
      console.log(`[Vertex AI] Including reference image for character consistency`);
    }

    // Build parts array with reference image if provided
    const parts: any[] = [{ text: prompt }];
    if (referenceImage) {
      // Extract base64 data if it's a data URL
      const base64Data = referenceImage.includes('base64,') 
        ? referenceImage.split('base64,')[1] 
        : referenceImage;
      
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: base64Data
        }
      });
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vertexToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: parts
        }],
        generationConfig: {
          temperature: 0.8,
          candidateCount: 1,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Vertex AI] Image generation error for model', model.id, response.status, errorText);
      lastErrorText = errorText;

      // Check if we should fall back to next model
      const shouldFallback = (
        (response.status === 404 || response.status === 429 || errorText.includes('RESOURCE_EXHAUSTED'))
        && i < models.length - 1
      );

      if (shouldFallback) {
        console.warn(`[Vertex AI] Model ${model.id} failed (${response.status}), falling back to next model...`);
        continue;
      }

      // Last model or non-recoverable error
      throw new Error(`Vertex AI image generation failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[Vertex AI] Response structure:', JSON.stringify(data, null, 2).substring(0, 500));

    const candidate = data.candidates?.[0];
    if (!candidate) {
      console.error('[Vertex AI] No candidate in response for model', model.id);
      continue;
    }

    const imagePart = candidate.content?.parts?.find((p: any) =>
      p.inlineData?.mimeType?.startsWith('image/')
    );

    if (!imagePart?.inlineData?.data) {
      console.error('[Vertex AI] No image data in response for model', model.id, 'full:', JSON.stringify(data, null, 2));
      continue;
    }

    console.log('[Vertex AI] Image generated successfully with model', model.id, 'size:', imagePart.inlineData.data.length, 'bytes');

    return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
  }

  throw new Error(`Vertex AI image generation failed: no usable model response. Last error: ${lastErrorText}`);
}
