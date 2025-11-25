import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';
import { generateVertexAuthToken } from '../_shared/vertex-auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OptimizationRequest {
  content: string;
  platforms: string[];
  optimizationType: 'hashtags' | 'timing' | 'adaptation';
  userProfile?: any;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { content, platforms, optimizationType, userProfile }: OptimizationRequest = await req.json();

    console.log(`Optimizing content for ${platforms.join(', ')} - Type: ${optimizationType}`);

    // Get Vertex AI access token
    const accessToken = await generateVertexAuthToken();
    const projectId = Deno.env.get('VERTEX_PROJECT_ID') || 'sineva-ai-441619';
    const location = Deno.env.get('VERTEX_LOCATION') || 'us-central1';

    let systemInstruction = '';
    let userPrompt = '';

    switch (optimizationType) {
      case 'hashtags':
        systemInstruction = `You are a social media expert specializing in hashtag strategy. Generate relevant, trending hashtags that will maximize reach and engagement.`;
        userPrompt = `Generate optimal hashtags for this social media post across ${platforms.join(', ')}:\n\n"${content}"\n\nProvide 5-10 hashtags that are:\n1. Relevant to the content\n2. Mix of popular and niche tags\n3. Platform-appropriate\n\nReturn ONLY a JSON object with this structure:\n{\n  "hashtags": ["hashtag1", "hashtag2", ...],\n  "reasoning": "Brief explanation of hashtag selection"\n}`;
        break;

      case 'timing':
        systemInstruction = `You are a social media analytics expert. Recommend optimal posting times based on platform best practices and content type.`;
        userPrompt = `Recommend the best times to post this content across ${platforms.join(', ')}:\n\n"${content}"\n\nConsider:\n1. Platform-specific peak engagement times\n2. Content type (promotional, educational, entertainment)\n3. Target audience timezone (assume US Eastern)\n\nReturn ONLY a JSON object with this structure:\n{\n  "recommendations": {\n    "platform": {\n      "bestTimes": ["HH:MM", "HH:MM"],\n      "timezone": "EST",\n      "reasoning": "Brief explanation"\n    }\n  }\n}`;
        break;

      case 'adaptation':
        systemInstruction = `You are a social media content strategist. Adapt content to be optimal for each platform while maintaining the core message.`;
        userPrompt = `Adapt this content for ${platforms.join(', ')}:\n\n"${content}"\n\nFor each platform, optimize:\n1. Tone and style\n2. Length and formatting\n3. Call-to-action\n4. Emoji usage\n\nReturn ONLY a JSON object with this structure:\n{\n  "adaptations": {\n    "platform": {\n      "content": "Adapted content",\n      "changes": "What was changed and why"\n    }\n  }\n}`;
        break;
    }

    // Add brand context if available
    if (userProfile) {
      systemInstruction += `\n\nBrand Context:\n- Brand Voice: ${userProfile.brand_voice || 'Professional'}\n- Industry: ${userProfile.industry || 'General'}\n- Target Audience: ${userProfile.target_audience || 'General public'}`;
    }

    // Call Gemini 2.5 Pro
    const vertexUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/gemini-2.5-pro-preview-03-25:generateContent`;

    const vertexResponse = await fetch(vertexUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: userPrompt }]
        }],
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          topP: 0.95,
        }
      })
    });

    if (!vertexResponse.ok) {
      const errorText = await vertexResponse.text();
      throw new Error(`Vertex AI error: ${errorText}`);
    }

    const vertexData = await vertexResponse.json();
    const responseText = vertexData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error('No response from AI');
    }

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const optimization = JSON.parse(jsonMatch[0]);

    console.log('Optimization complete');

    return new Response(
      JSON.stringify({
        success: true,
        optimization,
        type: optimizationType
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in optimize-social-content:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error?.message || 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
