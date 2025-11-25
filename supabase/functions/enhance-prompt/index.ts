import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, mode, negativePrompt } = await req.json();
    
    // Get Vertex AI credentials
    const serviceAccountJson = Deno.env.get("VERTEX_AI_CREDENTIALS");
    if (!serviceAccountJson) throw new Error("VERTEX_AI_CREDENTIALS not configured");

    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId = serviceAccount.project_id;
    const location = "us-central1";

    // Generate access token
    const accessToken = await getAccessToken(serviceAccount);

    // Create system prompt based on mode
    let systemPrompt = `You are an expert video prompt engineer. Enhance prompts for best results.

Guidelines:
- Add cinematic details: lighting, camera work, atmosphere
- Specify visual quality: 4K, high resolution, professional
- Include motion details: smooth, fluid, dynamic
- Add style descriptors: cinematic, dramatic, natural
- Keep core idea intact
- Output ONLY the enhanced prompt
- Keep it under 500 characters

Mode: ${mode || 'text_to_video'}`;

    if (mode === "frames_to_video") {
      systemPrompt += "\nFocus on motion and transition between frames.";
    } else if (mode === "ingredients_to_video") {
      systemPrompt += "\nFocus on how elements move and interact.";
    } else if (mode === "extend") {
      systemPrompt += "\nFocus on continuation or next sequence.";
    }

    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/gemini-2.5-flash:generateContent`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [{ text: `${systemPrompt}\n\nEnhance: "${prompt}"` }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 512
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Vertex AI error:", response.status, errorText);
      throw new Error("Enhancement failed");
    }

    const data = await response.json();
    const enhancedPrompt = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || prompt;

    return new Response(
      JSON.stringify({
        enhancedPrompt,
        enhancedNegativePrompt: negativePrompt,
        originalPrompt: prompt,
        originalNegativePrompt: negativePrompt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Error enhancing prompt:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function getAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const jwtHeader = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const jwtClaimSet = btoa(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));

  const unsignedJwt = `${jwtHeader}.${jwtClaimSet}`;
  
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(unsignedJwt)
  );

  const signedJwt = `${unsignedJwt}.${btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${signedJwt}`,
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const pemContents = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binaryString = atob(pemContents);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}