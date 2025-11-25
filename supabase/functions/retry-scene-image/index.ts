import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { generateVertexAuthToken, getVertexProjectId } from "../_shared/vertex-auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RetryImageRequest {
  sceneId: string;
  customPrompt?: string; // Optional: user can provide editing instructions
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { sceneId, customPrompt }: RetryImageRequest = await req.json();

    console.log('Retrying image generation for scene:', sceneId);

    // Get scene details
    const { data: scene, error: sceneError } = await supabaseClient
      .from('video_story_scenes')
      .select('*, video_generations!inner(user_id, style)')
      .eq('id', sceneId)
      .single();

    if (sceneError) throw sceneError;
    if (!scene) throw new Error('Scene not found');

    // Verify ownership
    if (scene.video_generations.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized access to scene' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Vertex AI auth
    const vertexToken = await generateVertexAuthToken();
    const projectId = getVertexProjectId();

    // Build prompt
    const style = scene.video_generations.style || 'narrative';
    const stylePrompts: Record<string, string> = {
      narrative: 'cinematic, emotional, story-driven, dramatic lighting',
      viral: 'vibrant colors, dynamic, eye-catching',
      music: 'artistic, creative, bold colors',
      product: 'professional, clean, modern'
    };

    const styleEnhancement = stylePrompts[style] || stylePrompts.narrative;
    
    let prompt = scene.visual_description;
    
    // If custom prompt provided (for editing), use it
    if (customPrompt) {
      prompt = `${scene.visual_description}. MODIFICATION: ${customPrompt}. ${styleEnhancement}. Mood: ${scene.mood}. Maintain overall scene composition.`;
    } else {
      // Standard retry with improved character consistency
      prompt = `CRITICAL: Maintain exact character consistency. ${scene.visual_description}. ${styleEnhancement}. Mood: ${scene.mood}. Same characters as in other scenes, identical appearance, photorealistic.`;
    }

    // Generate image
    const imageData = await generateImage(prompt, vertexToken, projectId);

    // Update scene with new image
    const { error: updateError } = await supabaseClient
      .from('video_story_scenes')
      .update({ image_url: imageData })
      .eq('id', sceneId);

    if (updateError) throw updateError;

    console.log('✓ Image regenerated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageData,
        message: 'Image regenerated successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error retrying image:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateImage(prompt: string, vertexToken: string, projectId: string): Promise<string> {
  const models = [
    { id: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image (primary)' },
    { id: 'gemini-3-pro-image-preview', label: 'Gemini 3 Pro Image (fallback)' },
  ];

  let lastErrorText = '';

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const endpoint = `https://aiplatform.googleapis.com/v1/projects/${projectId}/locations/global/publishers/google/models/${model.id}:generateContent`;

    console.log(`[Retry] Calling ${model.label}...`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vertexToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
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
      console.error(`[Retry] Error for ${model.id}:`, response.status, errorText);
      lastErrorText = errorText;
      
      // Check if we should fall back to next model
      const shouldFallback = (
        (response.status === 404 || response.status === 429 || errorText.includes('RESOURCE_EXHAUSTED'))
        && i < models.length - 1
      );

      if (shouldFallback) {
        console.warn(`[Retry] Model ${model.id} failed (${response.status}), falling back to next model...`);
        continue;
      }
      
      // Last model or non-recoverable error
      throw new Error(`Image generation failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const imagePart = data.candidates?.[0]?.content?.parts?.find((p: any) =>
      p.inlineData?.mimeType?.startsWith('image/')
    );

    if (!imagePart?.inlineData?.data) {
      console.error(`[Retry] No image data for ${model.id}`);
      continue;
    }

    console.log(`[Retry] ✓ Image generated with ${model.id}`);
    return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
  }

  throw new Error('Failed to generate image with all available models');
}
