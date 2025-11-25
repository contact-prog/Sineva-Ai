import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// Generate OAuth2 access token for Google Cloud
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
  
  let pemKey = credentials.private_key
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  
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

// Translate text using Google Cloud Translation API
async function translateText(
  accessToken: string,
  projectId: string,
  texts: string[],
  targetLanguage: string,
  sourceLanguage: string = 'en'
): Promise<string[]> {
  const endpoint = `https://translation.googleapis.com/v3/projects/${projectId}/locations/global:translateText`;

  const requestBody = {
    contents: texts,
    mimeType: 'text/plain',
    sourceLanguageCode: sourceLanguage,
    targetLanguageCode: targetLanguage,
  };

  console.log('Translating to:', targetLanguage);

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
    console.error('Translation API error:', response.status, errorText);
    throw new Error(`Translation API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('Translation successful');

  return data.translations.map((t: any) => t.translatedText);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { texts, targetLanguage, sourceLanguage = 'en' } = await req.json();

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      throw new Error('Texts array is required');
    }

    if (!targetLanguage) {
      throw new Error('Target language is required');
    }

    // If target language is the same as source, return original texts
    if (targetLanguage === sourceLanguage) {
      return new Response(
        JSON.stringify({ translations: texts }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Vertex AI credentials
    const vertexCredsJson = Deno.env.get('VERTEX_AI_CREDENTIALS');
    if (!vertexCredsJson) {
      throw new Error('VERTEX_AI_CREDENTIALS not configured');
    }

    const vertexCreds: VertexCredentials = JSON.parse(vertexCredsJson);
    const accessToken = await getAccessToken(vertexCreds);

    // Translate texts
    const translations = await translateText(
      accessToken,
      vertexCreds.project_id,
      texts,
      targetLanguage,
      sourceLanguage
    );

    return new Response(
      JSON.stringify({ translations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in translate-text function:', error);
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
