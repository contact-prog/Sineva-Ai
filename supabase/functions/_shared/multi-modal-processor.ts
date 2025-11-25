/**
 * PHASE 1.4: Multi-Modal Intelligence
 * Processes images, documents, and other media to extract insights
 */

interface ProcessedImage {
  description: string;
  objects: string[];
  text: string;
  colors: string[];
  mood: string;
  suggestions: string[];
}

interface ProcessedDocument {
  text: string;
  summary: string;
  keyPoints: string[];
  entities: string[];
}

/**
 * Analyze image using Gemini Vision
 */
export async function analyzeImage(
  imageUrl: string,
  geminiApiKey: string,
  purpose?: string
): Promise<ProcessedImage> {
  try {
    const prompt = purpose 
      ? `Analyze this image for ${purpose}. Describe what you see, identify objects, extract any text, note dominant colors, determine the mood/emotion, and suggest how it could be used in marketing.`
      : `Analyze this image comprehensively. Describe what you see, identify key objects, extract any visible text, note dominant colors, determine the mood/emotion conveyed, and suggest potential marketing uses.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: await fetchImageAsBase64(imageUrl)
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1024
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini Vision API error: ${response.status}`);
    }

    const data = await response.json();
    const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse structured information from analysis
    return {
      description: analysisText,
      objects: extractObjects(analysisText),
      text: extractText(analysisText),
      colors: extractColors(analysisText),
      mood: extractMood(analysisText),
      suggestions: extractSuggestions(analysisText)
    };
  } catch (error) {
    console.error('[MultiModal] Image analysis error:', error);
    throw error;
  }
}

/**
 * Process document and extract key information
 */
export async function processDocument(
  documentUrl: string,
  geminiApiKey: string
): Promise<ProcessedDocument> {
  try {
    // For now, assume text extraction is done elsewhere
    // This would integrate with document parsing APIs
    const text = await extractDocumentText(documentUrl);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{
              text: `Analyze this document and provide:
1. A concise summary (2-3 sentences)
2. Key points (bullet list)
3. Named entities (people, organizations, locations)

Document:
${text}`
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024
          }
        })
      }
    );

    const data = await response.json();
    const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      text: text,
      summary: extractSummary(analysisText),
      keyPoints: extractKeyPoints(analysisText),
      entities: extractEntities(analysisText)
    };
  } catch (error) {
    console.error('[MultiModal] Document processing error:', error);
    throw error;
  }
}

/**
 * Generate content recommendations based on multi-modal inputs
 */
export async function generateMultiModalRecommendations(
  inputs: {
    images?: ProcessedImage[];
    documents?: ProcessedDocument[];
    userMessage: string;
  },
  geminiApiKey: string
): Promise<string[]> {
  try {
    let context = `User request: ${inputs.userMessage}\n\n`;

    if (inputs.images && inputs.images.length > 0) {
      context += `Visual context:\n`;
      inputs.images.forEach((img, i) => {
        context += `Image ${i + 1}: ${img.description}\n`;
        context += `Objects: ${img.objects.join(', ')}\n`;
        context += `Mood: ${img.mood}\n\n`;
      });
    }

    if (inputs.documents && inputs.documents.length > 0) {
      context += `Document context:\n`;
      inputs.documents.forEach((doc, i) => {
        context += `Document ${i + 1} summary: ${doc.summary}\n`;
        context += `Key points: ${doc.keyPoints.join(', ')}\n\n`;
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{
              text: `${context}\n\nBased on this multi-modal context, suggest 3-5 specific marketing actions or content ideas the user should consider. Be creative and actionable.`
            }]
          }]
        })
      }
    );

    const data = await response.json();
    const recommendations = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    return recommendations.split('\n').filter((line: string) => line.trim().match(/^\d+\./));
  } catch (error) {
    console.error('[MultiModal] Recommendations error:', error);
    return [];
  }
}

// Helper functions for extraction
async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  return base64;
}

async function extractDocumentText(url: string): Promise<string> {
  // Placeholder - would integrate with document parsing service
  return "Document text extraction not yet implemented";
}

function extractObjects(text: string): string[] {
  const objectMatch = text.match(/objects?:(.+?)(?:\n|$)/i);
  if (!objectMatch) return [];
  return objectMatch[1].split(',').map(s => s.trim()).filter(Boolean);
}

function extractText(text: string): string {
  const textMatch = text.match(/text:(.+?)(?:\n|$)/i);
  return textMatch ? textMatch[1].trim() : '';
}

function extractColors(text: string): string[] {
  const colorMatch = text.match(/colors?:(.+?)(?:\n|$)/i);
  if (!colorMatch) return [];
  return colorMatch[1].split(',').map(s => s.trim()).filter(Boolean);
}

function extractMood(text: string): string {
  const moodMatch = text.match(/mood:(.+?)(?:\n|$)/i);
  return moodMatch ? moodMatch[1].trim() : 'neutral';
}

function extractSuggestions(text: string): string[] {
  const suggestions = text.match(/suggest(?:ions?)?:(.+?)(?:\n\n|$)/is);
  if (!suggestions) return [];
  return suggestions[1].split('\n').filter(Boolean).map(s => s.trim());
}

function extractSummary(text: string): string {
  const summaryMatch = text.match(/summary:(.+?)(?:\n\n|$)/is);
  return summaryMatch ? summaryMatch[1].trim() : text.substring(0, 200);
}

function extractKeyPoints(text: string): string[] {
  const keyPointsMatch = text.match(/key points?:(.+?)(?:\n\n|$)/is);
  if (!keyPointsMatch) return [];
  return keyPointsMatch[1].split('\n').filter(Boolean).map(s => s.replace(/^[-•*]\s*/, '').trim());
}

function extractEntities(text: string): string[] {
  const entitiesMatch = text.match(/(?:named )?entities:(.+?)(?:\n\n|$)/is);
  if (!entitiesMatch) return [];
  return entitiesMatch[1].split(',').map(s => s.trim()).filter(Boolean);
}
