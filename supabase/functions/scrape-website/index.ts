import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CrawledPage {
  url: string;
  markdown: string;
  html: string;
  metadata: any;
}

// Simple fallback scraper when Firecrawl is unavailable or fails
async function simpleScrapeWebsite(url: string): Promise<CrawledPage[]> {
  console.log('Running fallback scraper for URL:', url);
  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.error('Fallback scrape failed:', response.status, errorText);
    throw new Error(`Fallback scrape failed with status ${response.status}`);
  }

  const html = await response.text();
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i);

  const metadata = {
    title: titleMatch ? titleMatch[1].trim() : '',
    description: descMatch ? descMatch[1].trim() : '',
  };

  // Very basic markdown approximation: strip tags but keep text
  const markdown = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return [{
    url,
    html,
    markdown,
    metadata,
  }];
}

// AI-powered data extraction using Claude
async function extractDataWithAI(pages: CrawledPage[], domain: string) {
  const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');
  
  if (!claudeApiKey) {
    console.error('Claude API key not configured');
    return null;
  }

  // Prepare content for AI analysis
  const combinedContent = pages.map(p => `URL: ${p.url}\n\n${p.markdown.slice(0, 3000)}`).join('\n\n---\n\n');

  const prompt = `Analyze this website content and extract structured business information. Return ONLY valid JSON with no additional text.

Website Domain: ${domain}
Content from multiple pages:
${combinedContent}

Extract the following information in this exact JSON structure:
{
  "companyName": "string (the company/business name)",
  "tagline": "string (slogan or tagline if found)",
  "description": "string (one clear sentence, max 80 chars: what they do + who they serve)",
  "contactInfo": {
    "email": "string or null",
    "phone": "string or null",
    "address": "string or null"
  },
  "businessHours": "string or null (e.g., 'Mon-Fri 9am-5pm')",
  "location": {
    "city": "string or null",
    "state": "string or null",
    "country": "string or null"
  },
  "socialLinks": [
    {"platform": "string", "url": "string"}
  ],
  "services": ["string array of TOP 5 main services/products only"],
  "industry": "string (best guess at industry/category)"
}

Return ONLY the JSON object, no markdown, no explanation.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Claude API error:', error);
      return null;
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return null;
  } catch (error) {
    console.error('AI extraction error:', error);
    return null;
  }
}

// Helper function to convert binary to base64url
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Helper function to convert string to base64url
function stringToBase64Url(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Get Vertex AI access token
async function getVertexAIAccessToken(credentials: any): Promise<string> {
  try {
    const header = stringToBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const now = Math.floor(Date.now() / 1000);
    const payload = stringToBase64Url(JSON.stringify({
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    }));

    const signatureInput = `${header}.${payload}`;
    const key = await crypto.subtle.importKey(
      'pkcs8',
      pemToArrayBuffer(credentials.private_key),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signatureInput));
    const signatureBase64 = arrayBufferToBase64Url(signature);
    const jwt = `${signatureInput}.${signatureBase64}`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      throw new Error(`Failed to get access token: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      console.error('No access token in response:', tokenData);
      throw new Error('No access token received');
    }
    
    return tokenData.access_token;
  } catch (error) {
    console.error('Error getting Vertex AI access token:', error);
    throw error;
  }
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Industry-standard logo scraping with multiple fallback methods
async function findLogo(pages: CrawledPage[], domain: string): Promise<string> {
  console.log('🔍 Starting comprehensive logo search for:', domain);
  
  // Method 1: Clearbit Logo API (Industry standard, high-quality logos)
  try {
    const clearbitUrl = `https://logo.clearbit.com/${domain}`;
    const response = await fetch(clearbitUrl, { 
      method: 'HEAD', 
      signal: AbortSignal.timeout(5000),
      redirect: 'follow'
    });
    if (response.ok) {
      console.log('✅ Logo found via Clearbit API (best quality)');
      return clearbitUrl;
    }
  } catch (error) {
    console.log('⚠️ Clearbit unavailable, trying alternative methods...');
  }

  // Method 2: Google Favicon Service (reliable backup)
  try {
    const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
    const faviconResponse = await fetch(googleFaviconUrl, { 
      method: 'HEAD',
      signal: AbortSignal.timeout(3000)
    });
    if (faviconResponse.ok) {
      console.log('✅ Logo found via Google Favicon Service');
      return googleFaviconUrl;
    }
  } catch (error) {
    console.log('⚠️ Google Favicon unavailable, continuing...');
  }

  // Method 3: Brandfetch API (alternative logo provider)
  try {
    const brandfetchUrl = `https://logo.brandfetch.io/${domain}`;
    const response = await fetch(brandfetchUrl, { 
      method: 'HEAD',
      signal: AbortSignal.timeout(3000)
    });
    if (response.ok) {
      console.log('✅ Logo found via Brandfetch API');
      return brandfetchUrl;
    }
  } catch (error) {
    console.log('⚠️ Brandfetch unavailable, trying HTML parsing...');
  }

  // Method 4: Advanced HTML parsing with priority patterns
  for (const page of pages) {
    if (!page.html && !page.markdown) continue;
    
    const content = page.html || page.markdown || '';
    
    // Priority logo patterns (ordered by likelihood of success)
    const logoPatterns = [
      // Open Graph image (often high-quality logo)
      /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i,
      // Twitter card image
      /<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i,
      // Apple touch icon (usually high-res)
      /<link\s+rel=["']apple-touch-icon["']\s+(?:sizes=["'][^"']*["']\s+)?href=["']([^"']+)["']/i,
      // SVG logos (scalable, best quality)
      /<link\s+rel=["']icon["']\s+type=["']image\/svg\+xml["']\s+href=["']([^"']+)["']/i,
      // Img tags with "logo" in class
      /<img[^>]+class=["'][^"']*logo[^"']*["'][^>]+src=["']([^"']+)["']/i,
      // Img tags with "logo" in id
      /<img[^>]+id=["'][^"']*logo[^"']*["'][^>]+src=["']([^"']+)["']/i,
      // Img tags with "logo" in alt
      /<img[^>]+alt=["'][^"']*logo[^"']*["'][^>]+src=["']([^"']+)["']/i,
      // Reversed patterns
      /<img[^>]+src=["']([^"']+)["'][^>]+class=["'][^"']*logo[^"']*["']/i,
      // Picture elements with logo
      /<picture[^>]*class=["'][^"']*logo[^"']*["'][^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["']/i,
      // High-res favicon
      /<link\s+rel=["']icon["']\s+(?:type=["'][^"']*["']\s+)?(?:sizes=["'][^"']*["']\s+)?href=["']([^"']+)["']/i,
    ];

    for (const pattern of logoPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        let logoUrl = match[1];
        
        // Handle relative URLs
        if (!logoUrl.startsWith('http')) {
          if (logoUrl.startsWith('//')) {
            logoUrl = 'https:' + logoUrl;
          } else if (logoUrl.startsWith('/')) {
            logoUrl = `https://${domain}${logoUrl}`;
          } else {
            logoUrl = `https://${domain}/${logoUrl}`;
          }
        }
        
        // Verify the logo URL is accessible
        try {
          const verifyResponse = await fetch(logoUrl, { 
            method: 'HEAD',
            signal: AbortSignal.timeout(3000)
          });
          if (verifyResponse.ok) {
            const contentType = verifyResponse.headers.get('content-type') || '';
            if (contentType.includes('image')) {
              console.log('✅ Logo found via HTML parsing:', logoUrl);
              return logoUrl;
            }
          }
        } catch (error) {
          continue;
        }
      }
    }

    // Check og:image metadata
    if (page.metadata?.ogImage) {
      const ogImage = page.metadata.ogImage;
      if (ogImage.toLowerCase().includes('logo') || ogImage.match(/\.(png|jpg|jpeg|svg|webp)(\?.*)?$/i)) {
        console.log('✅ Logo found in page metadata');
        return ogImage;
      }
    }
  }

  // Method 5: Try common logo file paths with validation
  console.log('🔍 Checking common logo paths...');
  const commonLogoPaths = [
    '/logo.svg', '/logo.png', '/logo.jpg', '/logo.webp', '/logo.ico',
    '/images/logo.svg', '/images/logo.png', '/images/logo.jpg',
    '/assets/logo.svg', '/assets/logo.png', '/assets/images/logo.svg',
    '/img/logo.svg', '/img/logo.png', '/img/logo.jpg',
    '/static/logo.svg', '/static/logo.png', '/static/images/logo.png',
    '/brand/logo.svg', '/brand/logo.png',
    '/media/logo.svg', '/media/logo.png',
    '/content/logo.svg', '/content/logo.png',
    '/wp-content/uploads/logo.png', '/wp-content/uploads/logo.svg'
  ];

  for (const path of commonLogoPaths) {
    const logoUrl = `https://${domain}${path}`;
    try {
      const response = await fetch(logoUrl, { 
        method: 'HEAD', 
        signal: AbortSignal.timeout(3000) 
      });
      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('image')) {
          console.log(`✅ Logo found at common path: ${path}`);
          return logoUrl;
        }
      }
    } catch (error) {
      continue;
    }
  }

  // Method 6: Last resort - favicon.ico
  try {
    const faviconUrl = `https://${domain}/favicon.ico`;
    const response = await fetch(faviconUrl, { 
      method: 'HEAD',
      signal: AbortSignal.timeout(3000)
    });
    if (response.ok) {
      console.log('✅ Using favicon.ico as logo');
      return faviconUrl;
    }
  } catch (error) {
    console.log('⚠️ No favicon found');
  }

  console.log('❌ Logo search exhausted - no logo found');
  return '';
}

// Capture screenshots using ScreenshotOne API
async function captureScreenshots(url: string, userId: string, supabase: any) {
  const screenshotApiKey = Deno.env.get('SCREENSHOT_API_KEY');
  if (!screenshotApiKey) {
    console.log('Screenshot API key not configured, skipping screenshots');
    return { desktop: null, mobile: null };
  }

  try {
    // Desktop screenshot (1920x1080) with full page
    const desktopUrl = `https://api.screenshotone.com/take?access_key=${screenshotApiKey}&url=${encodeURIComponent(url)}&viewport_width=1920&viewport_height=1080&device_scale_factor=1&format=png&full_page=false&block_ads=true&block_cookie_banners=true&block_banners_by_heuristics=true&delay=3&cache=false`;
    
    // Mobile screenshot (375x812 - iPhone size) with full page
    const mobileUrl = `https://api.screenshotone.com/take?access_key=${screenshotApiKey}&url=${encodeURIComponent(url)}&viewport_width=375&viewport_height=812&device_scale_factor=2&format=png&full_page=false&block_ads=true&block_cookie_banners=true&block_banners_by_heuristics=true&delay=3&cache=false`;

    console.log('Capturing screenshots for:', url);

    const [desktopResponse, mobileResponse] = await Promise.all([
      fetch(desktopUrl),
      fetch(mobileUrl)
    ]);

    if (!desktopResponse.ok || !mobileResponse.ok) {
      const desktopError = !desktopResponse.ok ? await desktopResponse.text() : 'OK';
      const mobileError = !mobileResponse.ok ? await mobileResponse.text() : 'OK';
      console.error('Screenshot capture failed. Desktop:', desktopError, 'Mobile:', mobileError);
      return { desktop: null, mobile: null };
    }

    const [desktopBlob, mobileBlob] = await Promise.all([
      desktopResponse.blob(),
      mobileResponse.blob()
    ]);

    const timestamp = Date.now();
    const desktopPath = `${userId}/screenshots/desktop-${timestamp}.png`;
    const mobilePath = `${userId}/screenshots/mobile-${timestamp}.png`;

    // Upload to Supabase storage
    const [desktopUpload, mobileUpload] = await Promise.all([
      supabase.storage.from('brand-assets').upload(desktopPath, desktopBlob, {
        contentType: 'image/png',
        upsert: true
      }),
      supabase.storage.from('brand-assets').upload(mobilePath, mobileBlob, {
        contentType: 'image/png',
        upsert: true
      })
    ]);

    if (desktopUpload.error || mobileUpload.error) {
      console.error('Screenshot upload failed:', desktopUpload.error || mobileUpload.error);
      return { desktop: null, mobile: null };
    }

    // Get public URLs
    const { data: desktopUrlData } = supabase.storage.from('brand-assets').getPublicUrl(desktopPath);
    const { data: mobileUrlData } = supabase.storage.from('brand-assets').getPublicUrl(mobilePath);

    return {
      desktop: desktopUrlData.publicUrl,
      mobile: mobileUrlData.publicUrl
    };
  } catch (error) {
    console.error('Screenshot capture error:', error);
    console.error('Screenshot error details:', error instanceof Error ? error.message : String(error));
    return { desktop: null, mobile: null };
  }
}

// Enhanced color extraction using Claude Vision
async function analyzeVisualBrand(screenshotUrl: string) {
  if (!screenshotUrl) return null;

  const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');
  if (!claudeApiKey) return null;

  try {
    // Fetch the screenshot
    const imageResponse = await fetch(screenshotUrl);
    if (!imageResponse.ok) return null;

    const imageBlob = await imageResponse.blob();
    const arrayBuffer = await imageBlob.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    const prompt = `Analyze this website screenshot and extract detailed visual brand information. Return ONLY valid JSON with no additional text.

Provide:
{
  "colorPalette": {
    "primary": ["#hex1", "#hex2"],
    "secondary": ["#hex3", "#hex4"],
    "accent": ["#hex5", "#hex6"],
    "neutral": ["#hex7", "#hex8"]
  },
  "designStyle": "string (e.g., modern, minimalist, corporate, playful, elegant)",
  "layoutType": "string (e.g., hero-centered, grid-based, sidebar, full-width)",
  "typography": {
    "style": "string (e.g., sans-serif, serif, modern)",
    "hierarchy": "string (clear/moderate/minimal)"
  },
  "visualElements": ["string array of notable visual elements"],
  "brandPersonality": "string (2-3 adjectives describing the visual brand)"
}

Return ONLY the JSON object.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: base64Image
              }
            },
            {
              type: 'text',
              text: prompt
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude Vision analysis failed:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return null;
  } catch (error) {
    console.error('Visual analysis error:', error);
    console.error('Visual analysis error details:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

// Comprehensive brand intelligence analysis using Claude with tool calling
async function analyzeBrandIntelligence(
  companyData: any,
  contentData: string,
  visualData: any
) {
  const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');
  if (!claudeApiKey) return null;

  try {
    const prompt = `You are a brand strategist analyzing a company's online presence. Based on the comprehensive data below, provide detailed brand intelligence insights.

Company Data:
- Name: ${companyData.companyName || 'Unknown'}
- Industry: ${companyData.industry || 'Unknown'}
- Description: ${companyData.description || 'Not provided'}
- Services: ${companyData.services?.join(', ') || 'Not specified'}
- Location: ${companyData.location?.city || ''} ${companyData.location?.state || ''} ${companyData.location?.country || ''}

Visual Brand Analysis:
- Design Style: ${visualData?.designStyle || 'Unknown'}
- Layout: ${visualData?.layoutType || 'Unknown'}
- Typography: ${visualData?.typography?.style || 'Unknown'}
- Brand Personality: ${visualData?.brandPersonality || 'Unknown'}

Website Content (excerpt):
${contentData.slice(0, 2000)}

Analyze and provide detailed insights in JSON format:
{
  "brandVoice": {
    "tone": "communication style",
    "characteristics": ["trait1", "trait2"],
    "confidence": 0.0-1.0
  },
  "targetAudience": {
    "demographics": "age, gender, location, income",
    "psychographics": "interests, values, lifestyle",
    "painPoints": ["problem1", "problem2"],
    "confidence": 0.0-1.0
  },
  "industryAnalysis": {
    "category": "specific category",
    "marketPosition": "leader/challenger/niche",
    "competitors": ["comp1", "comp2"],
    "trends": ["trend1", "trend2"]
  },
  "taglineSuggestions": [
    {"text": "tagline", "rationale": "reason"}
  ],
  "contentStrategy": {
    "contentTypes": ["type1"],
    "postingFrequency": "schedule",
    "keyThemes": ["theme1"],
    "platforms": ["platform1"]
  },
  "brandStrengths": ["strength1"],
  "marketingRecommendations": [
    {"strategy": "name", "description": "details", "priority": "high/medium/low"}
  ]
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        temperature: 0.4,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Brand intelligence analysis failed:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return null;
  } catch (error) {
    console.error('Brand intelligence error:', error);
    console.error('Brand intelligence error details:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

// Helper to update job progress
async function updateJobProgress(
  supabase: any,
  jobId: string,
  progress: number,
  currentStep: string,
  partialResults?: any
) {
  const updateData: any = {
    progress_percentage: progress,
    current_step: currentStep,
    updated_at: new Date().toISOString(),
  };

  if (partialResults) {
    updateData.results = partialResults;
  }

  await supabase
    .from('scraping_jobs')
    .update(updateData)
    .eq('id', jobId);
  
  console.log(`Progress update: ${progress}% - ${currentStep}`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { url, userId = '00000000-0000-0000-0000-000000000000', bustCache } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'Website URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL format
    let validUrl = url.trim();
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = `https://${validUrl}`;
    }

    // Basic URL validation
    try {
      new URL(validUrl);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format', details: 'Please provide a valid website URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create scraping job
    const { data: job, error: jobError } = await supabase
      .from('scraping_jobs')
      .insert({
        user_id: userId,
        website_url: validUrl,
        status: 'processing',
        progress_percentage: 0,
        current_step: 'Initializing...',
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error('Failed to create job:', jobError);
      throw new Error('Failed to create scraping job');
    }

    console.log('Created scraping job:', job.id);

    // Return immediately with job ID (non-blocking)
    const jobId = job.id;
    
    // Start background processing
    const processInBackground = async () => {
      try {
        await updateJobProgress(supabase, jobId, 10, 'Starting crawl...');
        
        const domain = new URL(validUrl).hostname;
        const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
        if (!firecrawlApiKey) {
          throw new Error('FIRECRAWL_API_KEY not configured');
        }
        
        // Phase 1: Multi-page crawl (with Firecrawl v2) or fallback direct fetch
        await updateJobProgress(supabase, jobId, 15, 'Connecting to Firecrawl service...');
        await new Promise(resolve => setTimeout(resolve, 1500)); // Pacing

        await updateJobProgress(supabase, jobId, 20, 'Starting multi-page website crawl...');

        let pages: CrawledPage[] = [];

        try {
          console.log('Starting Firecrawl v2 crawl for:', validUrl);

          // Firecrawl v2 API call
          const crawlResponse = await fetch('https://api.firecrawl.dev/v2/crawl', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: validUrl,
              limit: 5,
              maxDiscoveryDepth: 2,
              includePaths: ['/', '/about', '/contact', '/services', '/products'],
              scrapeOptions: {
                formats: ['markdown', 'html'],
                includeTags: ['meta', 'title', 'h1', 'h2', 'p', 'a', 'img'],
                onlyMainContent: true,
                maxAge: 0,
                blockAds: true,
              },
            }),
          });

          if (!crawlResponse.ok) {
            const errorText = await crawlResponse.text().catch(() => '');
            console.error('Firecrawl v2 crawl start failed:', crawlResponse.status, errorText);
            throw new Error(`Failed to start crawl: ${crawlResponse.status} - ${errorText}`);
          }

          const crawlData = await crawlResponse.json();
          console.log('Firecrawl v2 crawl started:', crawlData);
          
          const crawlId = crawlData.id;
          if (!crawlId) {
            throw new Error('No crawl ID returned from Firecrawl');
          }

          // Poll for crawl completion (v2 endpoint)
          await updateJobProgress(supabase, jobId, 30, 'Processing pages...');
          let crawlStatus;
          let attempts = 0;
          const maxAttempts = 30;

          do {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const statusResponse = await fetch(`https://api.firecrawl.dev/v2/crawl/${crawlId}`, {
              headers: {
                'Authorization': `Bearer ${firecrawlApiKey}`,
              },
            });

            if (!statusResponse.ok) {
              const statusError = await statusResponse.text().catch(() => '');
              console.error('Firecrawl v2 status check failed:', statusResponse.status, statusError);
              throw new Error(`Crawl status check failed: ${statusResponse.status}`);
            }

            crawlStatus = await statusResponse.json();
            console.log('Firecrawl v2 status:', crawlStatus.status, 'completed:', crawlStatus.completed, 'total:', crawlStatus.total);
            attempts++;

            if (crawlStatus.status === 'completed') break;
            if (crawlStatus.status === 'failed') {
              console.error('Firecrawl v2 crawl failed with status:', crawlStatus);
              throw new Error(`Crawl failed: ${JSON.stringify(crawlStatus)}`);
            }

            const progress = 30 + Math.min(attempts * 2, 30);
            const pagesCount = crawlStatus.completed || 0;
            await updateJobProgress(supabase, jobId, progress, `Crawled ${pagesCount} of ${crawlStatus.total || '?'} pages...`);
          } while (attempts < maxAttempts && crawlStatus.status !== 'completed');

          pages = crawlStatus.data || [];
          console.log(`Crawled ${pages.length} pages via Firecrawl v2`);
        } catch (firecrawlError) {
          console.error('Firecrawl v2 crawl failed, falling back to direct fetch:', firecrawlError);
          await updateJobProgress(supabase, jobId, 25, 'Firecrawl unavailable, trying direct website fetch...');

          // Fallback: simple direct scrape of the main page
          try {
            pages = await simpleScrapeWebsite(validUrl);
            console.log(`Fallback scraper retrieved ${pages.length} page(s)`);
          } catch (fallbackError) {
            console.error('Fallback scraper also failed:', fallbackError);
            throw new Error(`Could not connect to ${validUrl}. Please verify the URL is accessible.`);
          }
        }

        if (!pages || pages.length === 0) {
          throw new Error('No content could be retrieved from the website');
        }

        // Phase 2: AI-powered extraction with Claude
        await updateJobProgress(supabase, jobId, 50, 'Analyzing content with Claude AI...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Pacing
        
        const aiData = await extractDataWithAI(pages, domain);
        
        await updateJobProgress(supabase, jobId, 55, 'Extracted company information from AI analysis');
        
        // Phase 3: Visual Intelligence - Screenshot capture
        await updateJobProgress(supabase, jobId, 60, 'Capturing website screenshots...');
        await new Promise(resolve => setTimeout(resolve, 1500)); // Pacing
        
        const screenshots = await captureScreenshots(validUrl, userId, supabase);
        
        await updateJobProgress(supabase, jobId, 65, 'Screenshots captured successfully');
        
        // Phase 4: Visual brand analysis with Claude Vision
        await updateJobProgress(supabase, jobId, 70, 'Running Claude Vision analysis...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Pacing
        
        const visualAnalysis = screenshots.desktop 
          ? await analyzeVisualBrand(screenshots.desktop)
          : null;
        
        await updateJobProgress(supabase, jobId, 75, 'Visual brand analysis complete');
        
        // Phase 5: Smart logo detection
        await updateJobProgress(supabase, jobId, 78, 'Detecting brand logo...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Pacing
        
        const logoUrl = await findLogo(pages, domain);

        // Phase 6: Enhanced color extraction
        await updateJobProgress(supabase, jobId, 82, 'Extracting brand colors...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Pacing
        
        // Combine Claude Vision colors with HTML colors
        const aiColors = visualAnalysis?.colorPalette || {};
        const allHtml = pages.map(p => p.html).join(' ');
        const colorRegex = /#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b/g;
        const colorsFoundFromHtml = [...new Set((allHtml.match(colorRegex) || []).slice(0, 8))];
        
        const allColors = [
          ...(aiColors.primary || []),
          ...(aiColors.secondary || []),
          ...(aiColors.accent || []),
          ...(aiColors.neutral || []),
          ...colorsFoundFromHtml
        ];
        const uniqueColors = [...new Set(allColors)].slice(0, 8);

        // Phase 7: Brand Intelligence Analysis
        await updateJobProgress(supabase, jobId, 88, 'Generating AI brand intelligence insights...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Pacing
        
        const brandIntelligence = await analyzeBrandIntelligence(
          {
            companyName: aiData?.companyName || pages[0]?.metadata?.title?.split('|')[0]?.trim() || '',
            industry: aiData?.industry || '',
            description: aiData?.description || pages[0]?.metadata?.description || '',
            services: aiData?.services || [],
            location: aiData?.location || {}
          },
          pages[0]?.markdown || '',
          visualAnalysis
        );

        await updateJobProgress(supabase, jobId, 92, 'Brand intelligence analysis complete');

        // Phase 8: Combine all data
        await updateJobProgress(supabase, jobId, 95, 'Compiling all extracted data...');
        await new Promise(resolve => setTimeout(resolve, 1500)); // Final pacing
        
        const extractedData = {
          companyName: aiData?.companyName || pages[0]?.metadata?.title?.split('|')[0]?.trim() || '',
          description: aiData?.description || pages[0]?.metadata?.description || '',
          tagline: aiData?.tagline || '',
          colors: {
            primary: uniqueColors[0] || '',
            secondary: uniqueColors[1] || '',
            accent: uniqueColors[2] || '',
            additional: uniqueColors.slice(3, 8),
          },
          logoUrl,
          contactInfo: aiData?.contactInfo || { email: null, phone: null, address: null },
          businessHours: aiData?.businessHours || null,
          location: aiData?.location || { city: null, state: null, country: null },
          socialLinks: aiData?.socialLinks || [],
          services: aiData?.services || [],
          industry: aiData?.industry || '',
          pagesAnalyzed: pages.length,
          totalPages: pages.length,
          rawContent: pages[0]?.markdown?.slice(0, 2000) || '',
          screenshots: {
            desktop: screenshots.desktop,
            mobile: screenshots.mobile
          },
          visualAnalysis: visualAnalysis ? {
            designStyle: visualAnalysis.designStyle,
            layoutType: visualAnalysis.layoutType,
            typography: visualAnalysis.typography,
            visualElements: visualAnalysis.visualElements,
            brandPersonality: visualAnalysis.brandPersonality
          } : null,
          brandIntelligence: brandIntelligence ? {
            brandVoice: brandIntelligence.brandVoice,
            targetAudience: brandIntelligence.targetAudience,
            industryAnalysis: brandIntelligence.industryAnalysis,
            taglineSuggestions: brandIntelligence.taglineSuggestions,
            contentStrategy: brandIntelligence.contentStrategy,
            brandStrengths: brandIntelligence.brandStrengths,
            marketingRecommendations: brandIntelligence.marketingRecommendations
          } : null
        };

        await updateJobProgress(supabase, jobId, 100, 'Complete', extractedData);

        // Mark job as completed
        await supabase
          .from('scraping_jobs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', jobId);

        console.log('Scraping completed successfully for job:', jobId);

      } catch (error) {
        console.error('Background scraping error for job', jobId, ':', error);
        
        // Handle retries
        const { data: currentJob } = await supabase
          .from('scraping_jobs')
          .select('retry_count, max_retries')
          .eq('id', jobId)
          .single();
        
        if (currentJob && currentJob.retry_count < currentJob.max_retries) {
          await supabase
            .from('scraping_jobs')
            .update({
              status: 'retry',
              retry_count: currentJob.retry_count + 1,
              error_message: error instanceof Error ? error.message : String(error),
              updated_at: new Date().toISOString(),
            })
            .eq('id', jobId);
          
          console.log(`Job ${jobId} will be retried (attempt ${currentJob.retry_count + 1}/${currentJob.max_retries})`);
        } else {
          await supabase
            .from('scraping_jobs')
            .update({
              status: 'failed',
              error_message: error instanceof Error ? error.message : String(error),
              completed_at: new Date().toISOString(),
            })
            .eq('id', jobId);
        }
      }
    };

    // Fire and forget
    processInBackground();

    return new Response(
      JSON.stringify({ 
        success: true, 
        jobId,
        message: 'Scraping job started. Poll for results using the job ID.'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Scrape website error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to start scraping job',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
