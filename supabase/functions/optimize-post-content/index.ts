import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Vertex AI Configuration
const VERTEX_PROJECT_ID = Deno.env.get('VERTEX_PROJECT_ID') || 'ivory-setup-478904-r2';
const VERTEX_LOCATION = Deno.env.get('VERTEX_LOCATION') || 'us-central1';

async function getAccessToken(): Promise<string> {
  const credentials = Deno.env.get('VERTEX_AI_CREDENTIALS');
  if (!credentials) {
    throw new Error('VERTEX_AI_CREDENTIALS not configured');
  }

  const parsedCredentials = JSON.parse(credentials);
  const jwtHeader = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = btoa(JSON.stringify({
    iss: parsedCredentials.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }));

  const signatureInput = `${jwtHeader}.${jwtPayload}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    Uint8Array.from(atob(parsedCredentials.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, '')), c => c.charCodeAt(0)),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signatureInput));
  const jwt = `${signatureInput}.${btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResponse.ok) {
    throw new Error(`Failed to get access token: ${await tokenResponse.text()}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const { content, platform, optimizationType = 'all' } = await req.json();

    if (!content || !platform) {
      throw new Error('Content and platform are required');
    }

    // Get user's brand voice from profile
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('brand_voice, target_audience, company_name')
      .eq('id', user.id)
      .single();

    const brandVoice = profile?.brand_voice || 'professional';
    const targetAudience = profile?.target_audience || 'general audience';
    const companyName = profile?.company_name || 'your brand';

    // Build optimization prompt based on type and platform
    let systemPrompt = `You are an expert social media content optimizer for ${platform}. `;
    systemPrompt += `Brand voice: ${brandVoice}. Target audience: ${targetAudience}. Company: ${companyName}.`;

    let userPrompt = '';
    
    if (optimizationType === 'hashtags' || optimizationType === 'all') {
      userPrompt += `Suggest 5-10 relevant hashtags for this ${platform} post. `;
    }
    
    if (optimizationType === 'caption' || optimizationType === 'all') {
      userPrompt += `Optimize the caption for ${platform}, ensuring it matches the brand voice and engages the target audience. `;
    }
    
    if (optimizationType === 'length' || optimizationType === 'all') {
      userPrompt += `Ensure the content fits ${platform}'s best practices for length. `;
    }

    userPrompt += `\n\nOriginal content:\n${content}`;

    // Platform-specific guidelines
    const platformGuidelines: Record<string, string> = {
      facebook: 'Keep posts between 40-80 characters for highest engagement. Use storytelling.',
      instagram: 'Use 3-5 hashtags in the caption. Keep captions conversational. Encourage interaction.',
      twitter: 'Keep under 280 characters. Use 1-2 hashtags max. Be concise and punchy.',
      linkedin: 'Professional tone. Longer posts (1300-2000 chars) perform well. Use 3-5 hashtags.',
    };

    systemPrompt += ` ${platformGuidelines[platform] || ''}`;

    // Call Vertex AI Gemini
    const accessToken = await getAccessToken();
    const vertexUrl = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION}/publishers/google/models/gemini-2.5-flash:generateContent`;

    const vertexResponse = await fetch(vertexUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!vertexResponse.ok) {
      const errorText = await vertexResponse.text();
      console.error('Vertex AI error:', errorText);
      throw new Error(`Vertex AI request failed: ${vertexResponse.status}`);
    }

    const vertexData = await vertexResponse.json();
    const optimizedContent = vertexData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!optimizedContent) {
      throw new Error('No response from Vertex AI');
    }

    // Parse the response to extract suggestions
    const response: {
      optimizedCaption: string;
      hashtags: string[];
      suggestions: string[];
      characterCount: number;
      platformOptimal: boolean;
    } = {
      optimizedCaption: content, // Default to original
      hashtags: [],
      suggestions: [],
      characterCount: content.length,
      platformOptimal: false,
    };

    // Try to parse structured response
    const lines = optimizedContent.split('\n').filter((l: string) => l.trim());
    let captionSection = '';
    const hashtagSection: string[] = [];
    
    for (const line of lines) {
      if (line.toLowerCase().includes('caption:') || line.toLowerCase().includes('optimized:')) {
        captionSection = line.split(':')[1]?.trim() || '';
      } else if (line.startsWith('#')) {
        hashtagSection.push(line.trim());
      } else if (line.trim() && !line.includes(':')) {
        captionSection += ' ' + line.trim();
      }
    }

    if (captionSection) {
      response.optimizedCaption = captionSection;
      response.characterCount = captionSection.length;
    }

    if (hashtagSection.length > 0) {
      response.hashtags = hashtagSection;
    }

    // Check if length is optimal for platform
    const optimalLengths: Record<string, { min: number; max: number }> = {
      facebook: { min: 40, max: 80 },
      instagram: { min: 138, max: 2200 },
      twitter: { min: 71, max: 280 },
      linkedin: { min: 1300, max: 2000 },
    };

    const optimal = optimalLengths[platform];
    if (optimal) {
      response.platformOptimal = response.characterCount >= optimal.min && response.characterCount <= optimal.max;
    }

    // Generate suggestions
    if (!response.platformOptimal) {
      response.suggestions.push(`Consider ${response.characterCount < optimal.min ? 'expanding' : 'shortening'} your post for optimal ${platform} engagement.`);
    }

    console.log('Content optimization completed:', { platform, originalLength: content.length, optimizedLength: response.characterCount });

    return new Response(
      JSON.stringify({
        success: true,
        ...response,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error optimizing content:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
