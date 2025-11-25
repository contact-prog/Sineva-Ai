import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const { imageUrls, prompt, mode = 'edit' } = await req.json();

    if (!imageUrls || imageUrls.length === 0) {
      throw new Error("At least one image URL is required");
    }

    console.log(`Editing/composing images for user ${user.id}, mode: ${mode}`);

    // Get Vertex AI credentials
    const serviceAccountJson = Deno.env.get("VERTEX_AI_CREDENTIALS");
    if (!serviceAccountJson) throw new Error("Missing Vertex AI credentials");

    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId = serviceAccount.project_id;
    const location = "us-central1";

    // Generate access token
    const accessToken = await getAccessToken(serviceAccount);

    // Convert URLs to inline data
    const imageParts = await Promise.all(
      imageUrls.map(async (url: string) => {
        if (url.startsWith('data:')) {
          const [meta, data] = url.split(',');
          const mimeMatch = /^data:(.*?);base64$/.exec(meta);
          return {
            inlineData: {
              mimeType: mimeMatch ? mimeMatch[1] : 'image/png',
              data: data
            }
          };
        }

        const response = await fetch(url);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i += 8192) {
          const chunk = bytes.slice(i, i + 8192);
          binary += String.fromCharCode(...chunk);
        }

        return {
          inlineData: {
            mimeType: response.headers.get('Content-Type') || 'image/png',
            data: btoa(binary)
          }
        };
      })
    );

    // Call Gemini 2.5 Flash Image with retry logic
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/gemini-2.5-flash-image:generateContent`;

    let apiResponse;
    let lastError;
    const maxRetries = 3;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        console.log(`Retry attempt ${attempt} after ${delay}ms delay`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      apiResponse = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              ...imageParts,
              { text: prompt }
            ]
          }],
          generationConfig: {
            temperature: 0.9,
            topP: 0.95,
            maxOutputTokens: 8192,
          }
        })
      });

      if (apiResponse.ok) {
        break;
      }

      if (apiResponse.status === 429) {
        lastError = await apiResponse.text();
        console.log(`Rate limit hit (429), attempt ${attempt + 1}/${maxRetries}`);
        if (attempt === maxRetries - 1) {
          console.error("Gemini API error after retries:", apiResponse.status, lastError);
          throw new Error(`Rate limit exceeded. Please try again in a few moments.`);
        }
        continue;
      }

      const errorText = await apiResponse.text();
      console.error("Gemini API error:", apiResponse.status, errorText);
      throw new Error(`Image editing failed: ${apiResponse.status}`);
    }

    const result = await apiResponse!.json();
    const imageData = result.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData;

    if (!imageData) {
      console.error("No image data in response:", JSON.stringify(result));
      throw new Error("No edited image generated");
    }

    // Convert to data URL
    const imageUrl = `data:${imageData.mimeType};base64,${imageData.data}`;

    return new Response(
      JSON.stringify({ success: true, imageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in gemini-edit-image:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to edit image" }),
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