import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { estimateImageCost } from './cost-helpers.ts';
import { generateWithGeminiImage } from './helper-gemini-image.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Platform specifications
const PLATFORM_SPECS: Record<string, Record<string, any>> = {
  instagram: {
    'feed-post': { dimensions: '1080x1080', aspectRatio: '1:1' },
    'story': { dimensions: '1080x1920', aspectRatio: '9:16' },
    'reel': { dimensions: '1080x1920', aspectRatio: '9:16' },
  },
  facebook: {
    'feed-post': { dimensions: '1200x630', aspectRatio: '1.91:1' },
    'story': { dimensions: '1080x1920', aspectRatio: '9:16' },
    'cover-photo': { dimensions: '820x312', aspectRatio: '2.63:1' },
  },
  linkedin: {
    'feed-post': { dimensions: '1200x627', aspectRatio: '1.91:1' },
    'article': { dimensions: '1200x627', aspectRatio: '1.91:1' },
  },
  twitter: {
    'feed-post': { dimensions: '1200x675', aspectRatio: '16:9' },
    'header': { dimensions: '1500x500', aspectRatio: '3:1' },
  },
  pinterest: {
    'pin': { dimensions: '1000x1500', aspectRatio: '2:3' },
  },
  tiktok: {
    'video': { dimensions: '1080x1920', aspectRatio: '9:16' },
  },
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

// Determine logo placement based on content
function determineLogoPlacement(category: string, contentType: string, platforms: string[]) {
  if (category === 'product') {
    return { position: 'bottom-right', size: 'subtle', opacity: 0.9 };
  }
  if (category === 'quote' || category === 'announcement') {
    return { position: 'bottom-right', size: 'standard', opacity: 1.0 };
  }
  if (platforms.some(p => contentType === 'story')) {
    return { position: 'top-right', size: 'standard', opacity: 1.0 };
  }
  if (platforms.includes('linkedin') || platforms.includes('twitter')) {
    return { position: 'top-left', size: 'prominent', opacity: 1.0 };
  }
  return { position: 'bottom-right', size: 'standard', opacity: 1.0 };
}

// Detect category from prompt
function detectCategory(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes('quote') || lower.includes('text')) return 'quote';
  if (lower.includes('product') || lower.includes('showcase')) return 'product';
  if (lower.includes('announce') || lower.includes('launch')) return 'announcement';
  return 'lifestyle';
}

// Smart API selection - Always use Gemini 3.0 Pro Image (Nano banana pro)
function smartAPISelection(params: {
  category: string;
  hasText: boolean;
  quality: string;
  hasReferenceImage: boolean;
  platforms: string[];
  hasLogo: boolean;
}) {
  // Always use Gemini 3 Pro Image for all graphic generation
  return { 
    api: 'gemini-3-pro-image',
    model: 'gemini-3-pro-image-preview',
    reason: 'Using Gemini 3 Pro Image (Nano banana pro) for all graphic generation' 
  };
}

// Detect if prompt requires text rendering
function detectTextIntent(prompt: string): boolean {
  const textKeywords = ['quote', 'text', 'words', 'announcement', 'headline', 'slogan', 'tagline'];
  const lower = prompt.toLowerCase();
  return textKeywords.some(keyword => lower.includes(keyword));
}

// Enhance prompt with minimal guidance (no automatic brand injection)
function generatePromptEnhancement(
  userPrompt: string,
  category: string,
  profile: any,
  platforms: string[]
): string {
  // Only use user's exact prompt with minimal formatting guidance
  return `${userPrompt}

Create a clean, modern, professional social media graphic.`;
}

// Convert image URL to base64
export async function fetchAndConvertToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  // Convert to base64 without spreading large arrays (avoids stack overflow)
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  return btoa(binary);
}

// Generate with Gemini 3.0 Pro Image (Nano banana pro) - Unified generation function
async function generateWithImagen(params: {
  prompt: string;
  logoUrl: string | null;
  logoConfig: any;
  dimensions: string;
  aspectRatio: string;
  accessToken: string;
  projectId: string;
  model: string;
  quality: string;
}) {
  // Always use Gemini 3.0 Pro Image
  return await generateWithGeminiImage(params);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Require authenticated user so graphics show up under correct account
    const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization');
    if (!authHeader) {
      console.error('Missing Authorization header for generate-graphic');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: missing auth token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error('Failed to resolve user for generate-graphic:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: invalid auth token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log('Using user id for graphics generation:', userId);

    // DEV MODE: usage checks are effectively disabled (we only log)
    try {
      const { data: usageCheck, error: usageError } = await supabase.functions.invoke(
        'check-usage-limit',
        { body: { serviceType: 'graphics', creditsNeeded: 1, userId } }
      );
      if (usageError) {
        console.warn('Usage check failed, ignoring in development:', usageError);
      } else {
        console.log('Usage check result (dev):', usageCheck);
      }
    } catch (e) {
      console.warn('Usage check threw error, ignoring in development:', e);
    }

    const request = await req.json();
    const {
      platforms,
      contentTypes,
      prompt,
      quality,
      includeLogo,
      previewMode,
      approvedPreviewId,
      referenceImageUrl
    } = request;

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('logo_url, primary_color, secondary_color, brand_voice, company_name')
      .eq('id', userId)
      .single();

    if (includeLogo && !profile?.logo_url) {
      return new Response(
        JSON.stringify({ error: 'No logo found in Brand Kit. Upload one or disable "Include Logo".' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Vertex AI credentials
    const vertexCredsString = Deno.env.get('VERTEX_AI_CREDENTIALS');
    if (!vertexCredsString) {
      throw new Error('VERTEX_AI_CREDENTIALS not configured');
    }
    const vertexCreds: VertexCredentials = JSON.parse(vertexCredsString);
    const accessToken = await getAccessToken(vertexCreds);

    // PREVIEW MODE: Generate ONE image
    if (previewMode) {
      const previewPlatform = platforms[0] || 'instagram';
      const previewContentType = contentTypes[previewPlatform] || 'feed-post';
      const previewSpec = PLATFORM_SPECS[previewPlatform][previewContentType];
      const category = detectCategory(prompt);

      const apiSelection = smartAPISelection({
        category,
        hasText: detectTextIntent(prompt),
        quality,
        hasReferenceImage: !!referenceImageUrl,
        platforms: [previewPlatform],
        hasLogo: includeLogo
      });

      console.log(`Preview: Using ${apiSelection.model} - ${apiSelection.reason}`);

      const logoConfig = includeLogo 
        ? determineLogoPlacement(category, previewContentType, platforms)
        : null;

      const enhancedPrompt = generatePromptEnhancement(prompt, category, profile, [previewPlatform]);

      // Generate image with selected model
      const generationStartTime = Date.now();
      const imageBase64 = await generateWithImagen({
        prompt: enhancedPrompt,
        logoUrl: includeLogo ? profile.logo_url : null,
        logoConfig,
        dimensions: previewSpec.dimensions,
        aspectRatio: previewSpec.aspectRatio,
        accessToken,
        projectId: vertexCreds.project_id,
        model: apiSelection.model,
        quality
      });
      const generationTime = Date.now() - generationStartTime;

      // Upload to storage
      const fileName = `${userId}/${Date.now()}_preview.png`;
      const bytes = new Uint8Array(atob(imageBase64).split('').map(c => c.charCodeAt(0)));
      
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, bytes, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      // Save to database with model tracking
      const modelFamily = apiSelection.model.includes('gemini') ? 'gemini' : 'imagen';
      const { data: generation, error: dbError } = await supabase
        .from('graphic_generations')
        .insert({
          user_id: userId,
          platform: previewPlatform,
          content_type: previewContentType,
          category,
          prompt,
          enhanced_prompt: enhancedPrompt,
          model_used: apiSelection.model,
          model_family: modelFamily,
          model_version: apiSelection.model,
          model_reason: apiSelection.reason,
          generation_time_ms: generationTime,
          cost_estimate: estimateImageCost(apiSelection.model),
          image_url: urlData.publicUrl,
          dimensions: previewSpec.dimensions,
          is_preview: true,
          logo_included: includeLogo,
          logo_config: logoConfig,
          parameters: { ...request, apiReason: apiSelection.reason }
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        throw new Error(`Failed to save generation: ${dbError.message}`);
      }

      // Increment usage counter
      await supabase.functions.invoke('increment-usage', {
        body: {
          serviceType: 'graphics',
          operationType: 'preview_generation',
          creditsUsed: 1,
          metadata: { model: apiSelection.model, platform: previewPlatform }
        }
      });

      return new Response(
        JSON.stringify({
          success: true,
          preview: generation,
          apiUsed: apiSelection.api,
          reason: apiSelection.reason,
          logoPlacement: logoConfig
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // BATCH MODE: Generate for all platforms
    if (approvedPreviewId) {
      const { data: approvedPreview } = await supabase
        .from('graphic_generations')
        .select('*')
        .eq('id', approvedPreviewId)
        .single();

      if (!approvedPreview) {
        return new Response(
          JSON.stringify({ error: 'Preview not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const generations = [];

      for (const platform of platforms) {
        const contentType = contentTypes[platform];
        const platformSpec = PLATFORM_SPECS[platform][contentType];

        const imageBase64 = await generateWithImagen({
          prompt: approvedPreview.enhanced_prompt,
          logoUrl: includeLogo ? profile.logo_url : null,
          logoConfig: approvedPreview.logo_config,
          dimensions: platformSpec.dimensions,
          aspectRatio: platformSpec.aspectRatio,
          accessToken,
          projectId: vertexCreds.project_id,
          model: approvedPreview.model_version || 'imagen-4',
          quality: quality || 'standard'
        });

        const fileName = `${userId}/${Date.now()}_${platform}.png`;
        const bytes = new Uint8Array(atob(imageBase64).split('').map(c => c.charCodeAt(0)));
        
        await supabase.storage
          .from('logos')
          .upload(fileName, bytes, {
            contentType: 'image/png',
            upsert: false
          });

        const { data: urlData } = supabase.storage
          .from('logos')
          .getPublicUrl(fileName);

        const { data: generation } = await supabase
          .from('graphic_generations')
          .insert({
            user_id: userId,
            platform,
            content_type: contentType,
            category: approvedPreview.category,
            prompt: approvedPreview.prompt,
            enhanced_prompt: approvedPreview.enhanced_prompt,
            model_used: approvedPreview.model_used,
            image_url: urlData.publicUrl,
            dimensions: platformSpec.dimensions,
            is_preview: false,
            logo_included: includeLogo,
            logo_config: approvedPreview.logo_config,
            parent_preview_id: approvedPreviewId,
            parameters: approvedPreview.parameters
          })
          .select()
          .single();

        generations.push(generation);
      }

      return new Response(
        JSON.stringify({
          success: true,
          generations,
          message: `Generated ${generations.length} graphics for all platforms`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request: specify previewMode or approvedPreviewId' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});