import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, width = 1024, height = 576 } = await req.json();
    console.log('[generate-frame-image] Request received:', { prompt: prompt.substring(0, 100), width, height });

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    const VERTEX_CREDENTIALS = Deno.env.get('VERTEX_AI_CREDENTIALS');
    if (!VERTEX_CREDENTIALS) {
      console.error('[generate-frame-image] VERTEX_AI_CREDENTIALS not configured');
      throw new Error('VERTEX_AI_CREDENTIALS not configured');
    }

    const credentials = JSON.parse(VERTEX_CREDENTIALS);
    const projectId = credentials.project_id;
    console.log('[generate-frame-image] Using project:', projectId);

    // Get OAuth token from Vertex AI credentials
    console.log('[generate-frame-image] Requesting OAuth token...');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: await createJWT(credentials)
      })
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      console.error('[generate-frame-image] Token request failed:', tokenError);
      throw new Error(`OAuth token request failed: ${tokenResponse.status}`);
    }

    const { access_token } = await tokenResponse.json();
    console.log('[generate-frame-image] OAuth token obtained successfully');

    // Try Gemini 3 Pro Image (Nanobanana Pro) first
    const models = [
      'gemini-3-pro-image-preview',
      'gemini-2.5-flash-image'  // Fallback
    ];

    let imageData: any = null;
    let successModel: string = '';

    for (const model of models) {
      try {
        console.log(`[generate-frame-image] Attempting with model: ${model}`);
        const imageGenResponse = await fetch(
          `https://aiplatform.googleapis.com/v1/projects/${projectId}/locations/global/publishers/google/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                role: 'user',
                parts: [{ 
                  text: `Create a professional video frame for: ${prompt}. Dimensions: ${width}x${height}px. Cinematic quality with professional lighting and composition.` 
                }]
              }],
              generationConfig: {
                temperature: 0.7,
                topP: 0.95,
                topK: 40,
                candidateCount: 1,
                responseModalities: ['image']
              }
            })
          }
        );

        if (!imageGenResponse.ok) {
          const errorText = await imageGenResponse.text();
          console.error(`[generate-frame-image] ${model} failed:`, imageGenResponse.status, errorText);
          
          if (imageGenResponse.status === 404) {
            console.log(`[generate-frame-image] Model ${model} not found, trying next...`);
            continue;
          }
          
          throw new Error(`Image generation failed with ${model}: ${imageGenResponse.status}`);
        }

        imageData = await imageGenResponse.json();
        successModel = model;
        console.log(`[generate-frame-image] Image generated successfully with ${model}`);
        break;
      } catch (error) {
        console.error(`[generate-frame-image] Error with ${model}:`, error);
        if (model === models[models.length - 1]) {
          throw error;
        }
      }
    }

    if (!imageData) {
      throw new Error('All image generation models failed');
    }

    // Extract image from Gemini response
    console.log('[generate-frame-image] Parsing response...');
    if (!imageData.candidates || !imageData.candidates[0]) {
      console.error('[generate-frame-image] No candidates in response:', JSON.stringify(imageData));
      throw new Error('No candidates in Gemini response');
    }

    const candidate = imageData.candidates[0];
    if (!candidate.content || !candidate.content.parts) {
      console.error('[generate-frame-image] No content parts in candidate:', JSON.stringify(candidate));
      throw new Error('No content parts in response');
    }

    const imagePart = candidate.content.parts.find((part: any) => part.inlineData);
    if (!imagePart || !imagePart.inlineData || !imagePart.inlineData.data) {
      console.error('[generate-frame-image] No image in response parts:', JSON.stringify(candidate.content.parts));
      throw new Error('No image data in Gemini response');
    }

    const base64Image = imagePart.inlineData.data;
    console.log(`[generate-frame-image] Successfully extracted base64 image (${base64Image.length} chars)`);
    console.log(`[generate-frame-image] Model used: ${successModel}`);

    // Upload to Supabase Storage
    console.log('[generate-frame-image] Initializing Supabase client...');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[generate-frame-image] No authorization header');
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      console.error('[generate-frame-image] User authentication failed:', userError);
      throw new Error('Unauthorized');
    }

    console.log('[generate-frame-image] User authenticated:', user.id);

    // Decode base64 and upload
    console.log('[generate-frame-image] Decoding base64 image...');
    const imageBuffer = Uint8Array.from(atob(base64Image), c => c.charCodeAt(0));
    const fileName = `${user.id}/frames/generated-${Date.now()}.png`;

    console.log('[generate-frame-image] Uploading to storage:', fileName);
    const { error: uploadError } = await supabaseClient.storage
      .from('user-uploads')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('[generate-frame-image] Upload error:', uploadError);
      throw new Error('Failed to upload generated image');
    }

    const { data: { publicUrl } } = supabaseClient.storage
      .from('user-uploads')
      .getPublicUrl(fileName);

    console.log('[generate-frame-image] Upload successful:', publicUrl);

    return new Response(
      JSON.stringify({ imageUrl: publicUrl, modelUsed: successModel }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in generate-frame-image:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function createJWT(credentials: any): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: credentials.private_key_id
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    sub: credentials.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/cloud-platform'
  };

  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const privateKey = credentials.private_key;
  const keyData = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  
  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${signatureInput}.${encodedSignature}`;
}
