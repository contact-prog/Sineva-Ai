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
    const { imageUrl, prompt } = await req.json();
    console.log('[edit-frame-image] Request received:', { imageUrl: imageUrl.substring(0, 100), prompt: prompt.substring(0, 100) });

    if (!imageUrl || !prompt) {
      throw new Error('Image URL and prompt are required');
    }

    const VERTEX_CREDENTIALS = Deno.env.get('VERTEX_AI_CREDENTIALS');
    if (!VERTEX_CREDENTIALS) {
      console.error('[edit-frame-image] VERTEX_AI_CREDENTIALS not configured');
      throw new Error('VERTEX_AI_CREDENTIALS not configured');
    }

    const credentials = JSON.parse(VERTEX_CREDENTIALS);
    const projectId = credentials.project_id;
    console.log('[edit-frame-image] Using project:', projectId);

    // Get OAuth token
    console.log('[edit-frame-image] Requesting OAuth token...');
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
      console.error('[edit-frame-image] Token request failed:', tokenError);
      throw new Error(`OAuth token request failed: ${tokenResponse.status}`);
    }

    const { access_token } = await tokenResponse.json();
    console.log('[edit-frame-image] OAuth token obtained successfully');

    // Fetch the image and convert to base64
    console.log('[edit-frame-image] Fetching source image...');
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.error('[edit-frame-image] Failed to fetch source image:', imageResponse.status);
      throw new Error(`Failed to fetch source image: ${imageResponse.status}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
    console.log(`[edit-frame-image] Source image fetched and encoded (${base64Image.length} chars)`);

    // Try Gemini 3 Pro Image first, then fallback
    const models = [
      'gemini-3-pro-image-preview',
      'gemini-2.5-flash-image'  // Fallback
    ];

    let editData: any = null;
    let successModel: string = '';

    for (const model of models) {
      try {
        console.log(`[edit-frame-image] Attempting edit with model: ${model}`);
        const editResponse = await fetch(
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
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: 'image/png',
                      data: base64Image
                    }
                  }
                ]
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

        if (!editResponse.ok) {
          const errorText = await editResponse.text();
          console.error(`[edit-frame-image] ${model} failed:`, editResponse.status, errorText);
          
          if (editResponse.status === 404) {
            console.log(`[edit-frame-image] Model ${model} not found, trying next...`);
            continue;
          }
          
          throw new Error(`Image edit failed with ${model}: ${editResponse.status}`);
        }

        editData = await editResponse.json();
        successModel = model;
        console.log(`[edit-frame-image] Image edited successfully with ${model}`);
        break;
      } catch (error) {
        console.error(`[edit-frame-image] Error with ${model}:`, error);
        if (model === models[models.length - 1]) {
          throw error;
        }
      }
    }

    if (!editData) {
      throw new Error('All image editing models failed');
    }

    // Extract edited image from Gemini response
    console.log('[edit-frame-image] Parsing response...');
    if (!editData.candidates || !editData.candidates[0]) {
      console.error('[edit-frame-image] No candidates in response:', JSON.stringify(editData));
      throw new Error('No candidates in Gemini response');
    }

    const candidate = editData.candidates[0];
    if (!candidate.content || !candidate.content.parts) {
      console.error('[edit-frame-image] No content parts in candidate:', JSON.stringify(candidate));
      throw new Error('No content parts in response');
    }

    const imagePart = candidate.content.parts.find((part: any) => part.inlineData);
    if (!imagePart || !imagePart.inlineData || !imagePart.inlineData.data) {
      console.error('[edit-frame-image] No image in response parts:', JSON.stringify(candidate.content.parts));
      throw new Error('No image data in Gemini response');
    }

    const editedBase64 = imagePart.inlineData.data;
    console.log(`[edit-frame-image] Successfully extracted edited image (${editedBase64.length} chars)`);
    console.log(`[edit-frame-image] Model used: ${successModel}`);

    // Upload edited image
    console.log('[edit-frame-image] Initializing Supabase client...');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[edit-frame-image] No authorization header');
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      console.error('[edit-frame-image] User authentication failed:', userError);
      throw new Error('Unauthorized');
    }

    console.log('[edit-frame-image] User authenticated:', user.id);

    console.log('[edit-frame-image] Decoding edited base64 image...');
    const imageBytes = Uint8Array.from(atob(editedBase64), c => c.charCodeAt(0));
    const fileName = `${user.id}/frames/edited-${Date.now()}.png`;

    console.log('[edit-frame-image] Uploading to storage:', fileName);
    const { error: uploadError } = await supabaseClient.storage
      .from('user-uploads')
      .upload(fileName, imageBytes, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('[edit-frame-image] Upload error:', uploadError);
      throw new Error('Failed to upload edited image');
    }

    const { data: { publicUrl } } = supabaseClient.storage
      .from('user-uploads')
      .getPublicUrl(fileName);

    console.log('[edit-frame-image] Upload successful:', publicUrl);

    return new Response(
      JSON.stringify({ imageUrl: publicUrl, modelUsed: successModel }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in edit-frame-image:', error);
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
