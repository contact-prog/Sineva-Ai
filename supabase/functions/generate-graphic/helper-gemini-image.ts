/**
 * Gemini 3.0 Pro Image Generation Helper
 * For native logo composition and image-to-image generation
 */

import { fetchAndConvertToBase64 } from './index.ts';

export async function generateWithGeminiImage(params: {
  prompt: string;
  logoUrl: string | null;
  logoConfig: any;
  dimensions: string;
  aspectRatio: string;
  accessToken: string;
  projectId: string;
  quality: string;
}) {
  const startTime = Date.now();
  const endpoint = `https://aiplatform.googleapis.com/v1/projects/${params.projectId}/locations/global/publishers/google/models/gemini-3-pro-image-preview:generateContent`;

  // Enhanced prompt construction with quality support
  let enhancedPrompt = params.prompt;
  
  // Add quality instructions
  if (params.quality === 'high') {
    enhancedPrompt = `Create a high-quality, professional social media graphic with exceptional detail and clarity: ${enhancedPrompt}`;
  } else {
    enhancedPrompt = `Create a professional social media graphic: ${enhancedPrompt}`;
  }
  
  const parts: any[] = [{ text: enhancedPrompt }];

  // Add logo as inline data for native composition
  if (params.logoUrl) {
    const logoBase64 = await fetchAndConvertToBase64(params.logoUrl);
    const logoPosition = params.logoConfig?.position || 'bottom-right';
    const logoSize = params.logoConfig?.size || 'standard';
    
    // Add enhanced prompt for logo placement
    parts[0].text += `\n\nImportant: Naturally integrate the provided logo image in the ${logoPosition.replace('-', ' ')} area. The logo should be ${logoSize === 'subtle' ? 'subtle and small' : logoSize === 'prominent' ? 'prominent and clearly visible' : 'medium-sized and visible'}, blending naturally with the overall design.`;
    
    parts.push({
      inlineData: {
        mimeType: 'image/png',
        data: logoBase64
      }
    });
  }

  const requestBody = {
    contents: [{
      role: 'user',
      parts
    }],
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      candidateCount: 1,
      responseModalities: ['image']
    }
  };

  console.log('Generating with Gemini 3.0 Pro Image (Nano banana pro)...');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Gemini 3.0 Pro Image API error:', error);
    throw new Error(`Gemini 3.0 Pro Image API failed: ${response.status}`);
  }

  const data = await response.json();
  const generationTime = Date.now() - startTime;
  console.log(`Image generated with Gemini 3.0 Pro Image in ${generationTime}ms`);

  // Extract image from response
  if (!data.candidates || !data.candidates[0]) {
    console.error('No candidates in response:', JSON.stringify(data));
    throw new Error('No candidates in Gemini response');
  }

  const candidate = data.candidates[0];
  if (!candidate.content || !candidate.content.parts) {
    console.error('No content parts in candidate:', JSON.stringify(candidate));
    throw new Error('No content parts in response');
  }

  // Find the image part
  const imagePart = candidate.content.parts.find((part: any) => part.inlineData);
  if (!imagePart || !imagePart.inlineData || !imagePart.inlineData.data) {
    console.error('No image in response parts:', JSON.stringify(candidate.content.parts));
    throw new Error('No image data in Gemini response');
  }

  return imagePart.inlineData.data;
}
