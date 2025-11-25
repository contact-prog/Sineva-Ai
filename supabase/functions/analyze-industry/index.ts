import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VertexCredentials {
  project_id: string;
  private_key: string;
  client_email: string;
}

async function getAccessToken(credentials: VertexCredentials): Promise<string> {
  const { client_email, private_key } = credentials;
  
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encoder = new TextEncoder();
  const headerBase64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const claimBase64 = btoa(JSON.stringify(claim)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signatureInput = `${headerBase64}.${claimBase64}`;

  // Convert PEM private key to DER binary format
  const pemKey = private_key.replace(/\\n/g, '\n');
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = pemKey.replace(pemHeader, '').replace(pemFooter, '').replace(/\s/g, '');
  
  // Decode base64 to binary
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(signatureInput));
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const jwt = `${signatureInput}.${signatureBase64}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, websiteContent } = await req.json();

    if (!description && !websiteContent) {
      return new Response(
        JSON.stringify({ error: 'Description or website content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const credentialsJson = Deno.env.get('VERTEX_AI_CREDENTIALS');
    if (!credentialsJson) {
      throw new Error('VERTEX_AI_CREDENTIALS not configured');
    }

    const credentials: VertexCredentials = JSON.parse(credentialsJson);
    console.log('Getting access token...');
    const accessToken = await getAccessToken(credentials);

    const projectId = credentials.project_id;
    const location = 'us-central1';
    const model = 'gemini-2.0-flash-001';

    const industries = [
      'Technology & Software', 'E-commerce & Retail', 'Healthcare & Medical',
      'Finance & Banking', 'Real Estate', 'Education & Training',
      'Food & Beverage', 'Travel & Hospitality', 'Fashion & Apparel',
      'Beauty & Cosmetics', 'Automotive', 'Sports & Fitness',
      'Entertainment & Media', 'Marketing & Advertising', 'Legal Services',
      'Consulting & Professional Services', 'Manufacturing', 'Construction',
    ];

    const prompt = `Analyze this business and suggest the most appropriate industry category:

Description: ${description}
${websiteContent ? `Website Content: ${websiteContent}` : ''}

Available industries:
${industries.join(', ')}

Return ONLY valid JSON:
{
  "industry": "exact industry name from list",
  "confidence": 0.95
}`;

    const vertexUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;

    console.log('Calling Vertex AI for industry analysis...');
    const response = await fetch(vertexUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 256,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Vertex AI error:', response.status, errorText);
      throw new Error(`Vertex AI request failed: ${errorText}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    console.log('Generated analysis:', generatedText);

    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify({ 
        success: true, 
        industry: parsed.industry,
        confidence: parsed.confidence 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-industry:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
