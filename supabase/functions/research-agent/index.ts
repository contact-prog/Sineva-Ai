import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

async function getAccessToken(credentials: VertexCredentials): Promise<string> {
  const jwtHeader = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const jwtClaimSet = btoa(JSON.stringify({
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }));

  const signatureInput = `${jwtHeader}.${jwtClaimSet}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    Uint8Array.from(atob(credentials.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, '')), c => c.charCodeAt(0)),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signatureInput));
  const jwt = `${signatureInput}.${btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, depth = 'quick', includeCompetitors = false } = await req.json();
    
    console.log('Research agent received request:', { query, depth, includeCompetitors });

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user info
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    // Get Vertex AI credentials
    const vertexCredsString = Deno.env.get('VERTEX_AI_CREDENTIALS');
    if (!vertexCredsString) {
      throw new Error('Vertex AI credentials not configured');
    }

    const credentials: VertexCredentials = JSON.parse(vertexCredsString);
    const accessToken = await getAccessToken(credentials);

    // Call Gemini 2.5 Pro with web search grounding for research
    const vertexUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${credentials.project_id}/locations/us-central1/publishers/google/models/gemini-2.5-pro:generateContent`;

    const researchPrompt = `You are a marketing research specialist. Research the following topic thoroughly and provide strategic insights.

Topic: ${query}

Research Depth: ${depth === 'comprehensive' ? 'Comprehensive (detailed analysis)' : 'Quick (key insights only)'}
${includeCompetitors ? 'Include competitor analysis' : ''}

Provide your research in the following JSON format:
{
  "topic": "${query}",
  "keyPoints": ["point 1", "point 2", "point 3", ...],
  "recommendations": ["recommendation 1", "recommendation 2", ...],
  "targetAudience": "description of target audience",
  "bestPractices": ["best practice 1", "best practice 2", ...],
  "contentStrategy": "suggested content strategy",
  ${includeCompetitors ? '"competitors": ["competitor 1", "competitor 2", ...],' : ''}
  "summary": "brief executive summary"
}

Focus on:
- Current trends and what's working in the market
- Best practices for content creation
- Target audience insights
- Strategic recommendations
- Actionable insights for content creators`;

    console.log('Calling Vertex AI for research...');

    const vertexResponse = await fetch(vertexUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: researchPrompt }]
        }],
        generationConfig: {
          temperature: 0.3,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 2048,
        },
        tools: [{
          googleSearchRetrieval: {
            dynamicRetrievalConfig: {
              mode: 'MODE_DYNAMIC',
              dynamicThreshold: 0.7
            }
          }
        }]
      }),
    });

    if (!vertexResponse.ok) {
      const errorText = await vertexResponse.text();
      console.error('Vertex AI error:', vertexResponse.status, errorText);
      throw new Error(`Vertex AI request failed: ${vertexResponse.status} ${errorText}`);
    }

    const vertexData = await vertexResponse.json();
    console.log('Vertex AI research response received');

    const generatedText = vertexData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!generatedText) {
      throw new Error('No research insights generated');
    }

    // Parse JSON from response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    let insights;
    
    if (jsonMatch) {
      insights = JSON.parse(jsonMatch[0]);
    } else {
      // Fallback: create structured insights from text
      insights = {
        topic: query,
        keyPoints: [generatedText.substring(0, 200)],
        recommendations: ['Review generated research for detailed recommendations'],
        summary: generatedText.substring(0, 150),
        rawText: generatedText
      };
    }

    console.log('Research insights extracted:', { topic: insights.topic, pointCount: insights.keyPoints?.length });

    return new Response(
      JSON.stringify({ insights }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in research-agent:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        insights: null
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
