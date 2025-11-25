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
    console.error("Token request failed:", errorText);
    throw new Error(`Failed to get access token: ${tokenResponse.status}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

// Generate Vertex AI authentication token from environment credentials
export async function generateVertexAuthToken(): Promise<string> {
  const credentialsJson = Deno.env.get('VERTEX_AI_CREDENTIALS');
  
  if (!credentialsJson) {
    throw new Error('VERTEX_AI_CREDENTIALS environment variable is not set');
  }

  try {
    const credentials: VertexCredentials = JSON.parse(credentialsJson);
    const accessToken = await getAccessToken(credentials);
    return accessToken;
  } catch (error: any) {
    console.error('Failed to generate Vertex AI auth token:', error);
    throw new Error(`Vertex AI authentication failed: ${error.message}`);
  }
}

// Get Vertex AI project ID from credentials
export function getVertexProjectId(): string {
  const credentialsJson = Deno.env.get('VERTEX_AI_CREDENTIALS');
  
  if (!credentialsJson) {
    throw new Error('VERTEX_AI_CREDENTIALS environment variable is not set');
  }

  try {
    const credentials: VertexCredentials = JSON.parse(credentialsJson);
    return credentials.project_id;
  } catch (error: any) {
    console.error('Failed to parse Vertex AI credentials:', error);
    throw new Error(`Failed to get project ID: ${error.message}`);
  }
}
