import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Vertex AI credentials interface
interface VertexCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

// Generate OAuth2 access token for Vertex AI
async function getAccessToken(credentials: VertexCredentials): Promise<string> {
  const jwtHeader = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const jwtClaimSet = btoa(JSON.stringify({
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: credentials.token_uri,
    exp: now + 3600,
    iat: now,
  }));

  const unsignedJwt = `${jwtHeader}.${jwtClaimSet}`;
  
  // Convert PEM private key to binary DER format
  // Handle both actual newlines and escaped \n in the PEM string
  let pemKey = credentials.private_key
    .replace(/\\n/g, '\n')  // Replace escaped newlines with actual newlines
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');  // Remove all whitespace including newlines
  
  const binaryKey = Uint8Array.from(atob(pemKey), c => c.charCodeAt(0));
  
  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedJwt)
  );

  const signedJwt = `${unsignedJwt}.${btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;

  const tokenResponse = await fetch(credentials.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${signedJwt}`,
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('Token request failed:', errorText);
    throw new Error(`Failed to get access token: ${tokenResponse.status}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

// Fetch and convert image URL to base64
async function fetchAndConvertToBase64(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);
  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  
  // Convert to base64 without spreading large arrays (avoids stack overflow)
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  return btoa(binary);
}

// Edit image with Gemini 3.0 Pro Image (Nano banana pro)
async function editWithGeminiImage(
  accessToken: string,
  projectId: string,
  originalImageBase64: string,
  editPrompt: string,
  originalPrompt: string,
  negativePrompt?: string
): Promise<string> {
  const startTime = Date.now();
  const endpoint = `https://aiplatform.googleapis.com/v1/projects/${projectId}/locations/global/publishers/google/models/gemini-3-pro-image-preview:generateContent`;

  // Construct the edit instruction
  let fullPrompt = `Edit this image: ${editPrompt}. ${originalPrompt ? `Original concept: ${originalPrompt}.` : ''} Maintain overall composition and style while making the requested changes.`;
  
  if (negativePrompt) {
    fullPrompt += ` Avoid: ${negativePrompt}`;
  }

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: fullPrompt
          },
          {
            inlineData: {
              mimeType: "image/png",
              data: originalImageBase64
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.4,
      topP: 0.95,
      topK: 40,
      candidateCount: 1,
      responseModalities: ["image"]
    }
  };

  console.log('Sending edit request to Gemini 3.0 Pro Image...');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini Image API error:', response.status, errorText);
    throw new Error(`Gemini Image API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const editTime = Date.now() - startTime;
  console.log(`Edit response received from Gemini 3.0 Pro Image in ${editTime}ms`);

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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Require authenticated user so edited graphics are tied to the correct account
    const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization');
    if (!authHeader) {
      console.error('Missing Authorization header for edit-graphic');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: missing auth token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      console.error('Failed to resolve user for edit-graphic:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: invalid auth token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log('Processing edit request for user:', userId);

    // Parse request body
    const {
      imageUrl,
      editPrompt,
      originalPrompt,
      negativePrompt,
      quality = 'standard',
      includeLogo = false
    } = await req.json();

    console.log('Edit request:', { editPrompt, quality, includeLogo });

    // Get user profile for logo (optional in dev mode)
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('logo_url')
      .eq('id', userId)
      .maybeSingle();

    // Get Vertex AI credentials
    const vertexCredsJson = Deno.env.get('VERTEX_AI_CREDENTIALS');
    if (!vertexCredsJson) {
      throw new Error('VERTEX_AI_CREDENTIALS not configured');
    }

    const vertexCreds: VertexCredentials = JSON.parse(vertexCredsJson);
    const accessToken = await getAccessToken(vertexCreds);

    // Convert original image to base64
    console.log('Fetching original image...');
    const originalImageBase64 = await fetchAndConvertToBase64(imageUrl);

    // Get logo if needed
    let logoBase64: string | undefined;
    if (includeLogo && profile?.logo_url) {
      console.log('Fetching logo...');
      logoBase64 = await fetchAndConvertToBase64(profile.logo_url);
    }

    // Edit the image with Gemini Image
    const editedImageBase64 = await editWithGeminiImage(
      accessToken,
      vertexCreds.project_id,
      originalImageBase64,
      editPrompt,
      originalPrompt,
      negativePrompt
    );

    // Upload edited image to storage with proper folder structure
    const fileName = `${userId}/graphic_edit_${Date.now()}.png`;
    const bytes = new Uint8Array(atob(editedImageBase64).split('').map(c => c.charCodeAt(0)));

    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('logos')
      .upload(fileName, bytes, {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabaseClient.storage
      .from('logos')
      .getPublicUrl(fileName);

    console.log('Edited image uploaded successfully');

    // Save edited graphic to database
    const { data: editedGeneration, error: dbError } = await supabaseClient
      .from('graphic_generations')
      .insert({
        user_id: userId,
        platform: 'edited',
        content_type: 'edited',
        category: 'edited',
        prompt: `${originalPrompt} | Edit: ${editPrompt}`,
        enhanced_prompt: editPrompt,
        model_used: 'gemini-3-pro-image-preview',
        model_family: 'gemini',
        model_version: 'gemini-3-pro-image-preview',
        model_reason: 'Image editing with Gemini 3.0 Pro Image',
        image_url: publicUrl,
        dimensions: '1080x1080',
        is_preview: false,
        logo_included: includeLogo,
        generation_mode: 'edit',
        parameters: { editPrompt, originalPrompt }
      })
      .select()
      .single();

    if (dbError) {
      console.error('Failed to save edited graphic to database:', dbError);
      // Don't throw - still return the edited image even if DB save fails
    } else {
      console.log('Edited graphic saved to database:', editedGeneration?.id);
    }

    return new Response(
      JSON.stringify({
        editedImageUrl: publicUrl,
        message: 'Image edited successfully',
        generationId: editedGeneration?.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: unknown) {
    console.error('Error in edit-graphic function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
