import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { authenticateRequest } from "../_shared/auth-helpers.ts";

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
    throw new Error(`Failed to get access token: ${tokenResponse.status}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { toolName, toolResult, userContext } = await req.json();

    console.log('Generating cross-service suggestions for:', toolName);

    // Authenticate user using shared helper
    const { userId, supabase: supabaseClient, error: authError } = await authenticateRequest(req);

    // Try to load user profile, but don't fail hard if auth is missing
    let userProfile: any = null;

    if (authError || !userId || !supabaseClient) {
      console.error('Authentication failed in suggestions function, proceeding without user context:', authError);
    } else {
      console.log('User authenticated for suggestions:', userId);

      // Get user profile for richer context (best-effort)
      const { data, error: profileError } = await supabaseClient
        .from('user_profiles')
        .select('company_name, brand_voice, industry, goals, current_channels')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching user profile for suggestions:', profileError.message || profileError);
      } else {
        userProfile = data;
      }
    }

    // Get Vertex AI credentials
    const vertexCredsString = Deno.env.get('VERTEX_AI_CREDENTIALS');
    if (!vertexCredsString) {
      throw new Error('VERTEX_AI_CREDENTIALS not configured');
    }
    const credentials: VertexCredentials = JSON.parse(vertexCredsString);
    const accessToken = await getAccessToken(credentials);

    // Build context for AI analysis
    const analysisPrompt = `
You are Sineva Brain's cross-service intelligence analyzer. Analyze the recent action and suggest 2-3 strategic next steps across different services.

RECENT ACTION:
Tool: ${toolName}
Result: ${JSON.stringify(toolResult, null, 2)}

USER CONTEXT:
${userProfile ? `
- Company: ${userProfile.company_name || 'Unknown'}
- Industry: ${userProfile.industry || 'Unknown'}
- Brand Voice: ${userProfile.brand_voice || 'Professional'}
- Goals: ${userProfile.goals?.join(', ') || 'Growth'}
- Active Channels: ${userProfile.current_channels?.join(', ') || 'Multiple'}
` : 'No user context available'}

AVAILABLE SERVICES:
- Graphics Generation (create branded visuals for social media)
- Video Creation (produce professional video content)
- Content Writing (blog posts, captions, descriptions)
- Social Scheduling (schedule posts across platforms)
- Email Campaigns (create and send email content)
- Calendar Management (plan content calendar)

ANALYSIS RULES:
1. Suggest DIFFERENT services than what was just used
2. Be specific and actionable (not generic)
3. Consider the user's active channels and goals
4. Suggest complementary actions that amplify the original content
5. Keep suggestions strategic and results-oriented

OUTPUT FORMAT (JSON):
{
  "suggestions": [
    {
      "service": "service_name",
      "action": "Brief action title (max 6 words)",
      "description": "One sentence explaining the strategic benefit",
      "prompt": "Exact prompt to execute this action",
      "priority": "high" | "medium" | "low"
    }
  ]
}

Generate 2-3 strategic suggestions:`;

    // Call Gemini 2.5 Flash for fast analysis
    const vertexResponse = await fetch(
      `https://us-central1-aiplatform.googleapis.com/v1/projects/${credentials.project_id}/locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: analysisPrompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          }
        })
      }
    );

    if (!vertexResponse.ok) {
      const errorText = await vertexResponse.text();
      console.error('Vertex AI error:', errorText);
      throw new Error(`Vertex AI request failed: ${vertexResponse.status}`);
    }

    const data = await vertexResponse.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', responseText);
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const suggestions = JSON.parse(jsonMatch[0]);

    console.log('Generated suggestions:', suggestions);

    return new Response(
      JSON.stringify(suggestions),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating suggestions:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        suggestions: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
