import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { websiteUrl, userId, scrapedData } = await req.json();

    if (!websiteUrl || !userId) {
      throw new Error('Missing required parameters');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Starting magic onboarding for user ${userId} with website ${websiteUrl}`);

    // Use provided scraped data or fallback to basic data extraction
    const basicData: any = scrapedData || {};
    const urlDomain = new URL(websiteUrl).hostname.replace('www.', '');
    const companyName = basicData.companyName || urlDomain.split('.')[0].charAt(0).toUpperCase() + urlDomain.split('.')[0].slice(1);
    const industry = basicData.industry || basicData.suggestedIndustry || 'Business';
    const description = basicData.description || `A ${industry} company based on ${urlDomain}`;

    // Step 2: Parallel generation of content
    console.log('Generating AI content with:', { companyName, industry, description });
    const [postsResult, blogResult, strategyResult] = await Promise.all([
      generateSocialPosts(companyName, industry, description),
      generateBlogIdeas(companyName, industry, description),
      generateMarketingStrategy(companyName, industry, description)
    ]);

    // Step 3: Save to Brand Kit
    const scrapingSucceeded = !!scrapedData;
    const brandKit = await populateBrandKit(supabase, userId, basicData, websiteUrl, scrapingSucceeded);

    // Step 4: Save generated content
    await saveGeneratedContent(supabase, userId, postsResult, blogResult);

    return new Response(
      JSON.stringify({
        success: true,
        socialPosts: postsResult,
        blogIdeas: blogResult,
        marketingPlan: strategyResult,
        brandKit: brandKit,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Magic onboarding error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateSocialPosts(companyName: string, industry: string, description: string) {
  const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY');
  
  const fallbackPosts = () => ([
    {
      platform: 'LinkedIn',
      caption: `Introducing ${companyName}, a ${industry} company. ${description} #${industry.replace(/\s+/g, '')} #${companyName.replace(/\s+/g, '')}`,
    },
    {
      platform: 'Twitter',
      caption: `${companyName} helps customers with ${industry.toLowerCase()} solutions. Learn more on our website.`,
    },
    {
      platform: 'Facebook',
      caption: `We are ${companyName}! ${description} Follow us to stay updated with news, tips and stories.`,
    },
  ]);

  if (!CLAUDE_API_KEY) {
    console.error('CLAUDE_API_KEY not configured for generateSocialPosts');
    return fallbackPosts();
  }
  
  const prompt = `Generate 3 engaging social media posts for ${companyName}, a ${industry} company. ${description}

Create one post for each platform:
1. LinkedIn (professional, value-focused, 200-250 characters)
2. Twitter (concise, engaging, 200-250 characters)
3. Facebook (community-focused, conversational, 200-250 characters)

Each post should be platform-appropriate and include relevant hashtags.
Format your response as JSON with this structure:
{
  "linkedin": "post content here",
  "twitter": "post content here",
  "facebook": "post content here"
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('Claude social posts error:', response.status, errorText);
      return fallbackPosts();
    }

    const data = await response.json();
    
    if (!data || typeof data !== 'object') {
      console.error('Invalid data structure from Claude for social posts');
      return fallbackPosts();
    }
    
    const content: string | undefined = data.content?.[0]?.text;

    if (!content || typeof content !== 'string') {
      console.error('No valid content returned from Claude for social posts');
      return fallbackPosts();
    }
    
    // Try to parse JSON response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.linkedin && parsed.twitter && parsed.facebook) {
          return [
            { platform: 'LinkedIn', caption: parsed.linkedin },
            { platform: 'Twitter', caption: parsed.twitter },
            { platform: 'Facebook', caption: parsed.facebook },
          ];
        }
      }
    } catch (e) {
      console.error('Failed to parse JSON response for social posts, using fallback');
    }

    return fallbackPosts();
  } catch (error) {
    console.error('Error generating social posts with Claude:', error);
    return fallbackPosts();
  }
}

async function generateBlogIdeas(companyName: string, industry: string, description: string) {
  const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY');

  const fallbackIdeas = [
    `How ${companyName} Is Raising the Bar in ${industry}`,
    `5 Ways ${companyName} Helps You Succeed with ${industry}`,
    `The Future of ${industry}: Insights from ${companyName}`,
    `Practical Tips from ${companyName} for Better ${industry}`,
    `Why ${companyName} Cares About Your ${industry} Challenges`,
  ];
  
  if (!CLAUDE_API_KEY) {
    console.error('CLAUDE_API_KEY not configured for generateBlogIdeas');
    return fallbackIdeas;
  }
  
  const prompt = `Generate 5 compelling blog post titles for ${companyName}, a ${industry} company. ${description}

Each title should be:
- SEO-friendly
- Engaging and click-worthy
- Relevant to the industry
- Valuable to the target audience

Format: Return only the 5 titles, one per line, numbered 1-5.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('Claude blog ideas error:', response.status, errorText);
      return fallbackIdeas;
    }

    const data = await response.json();
    
    if (!data || typeof data !== 'object') {
      console.error('Invalid data structure from Claude for blog ideas');
      return fallbackIdeas;
    }
    
    const content: string | undefined = data.content?.[0]?.text;

    if (!content || typeof content !== 'string') {
      console.error('No valid content returned from Claude for blog ideas');
      return fallbackIdeas;
    }
    
    // Split by lines and clean up
    const ideas = content.split('\n')
      .filter((line: string) => line.trim())
      .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
      .slice(0, 5);

    return ideas.length > 0 ? ideas : fallbackIdeas;
  } catch (error) {
    console.error('Error generating blog ideas with Claude:', error);
    return fallbackIdeas;
  }
}

async function generateMarketingStrategy(companyName: string, industry: string, description: string) {
  const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY');

  const defaultStrategy = {
    recommendedPlatforms: ['LinkedIn', 'Twitter', 'Instagram'],
    postingFrequency: '3-5 times per week',
    contentMix: {
      educational: 60,
      promotional: 30,
      entertaining: 10,
    },
    bestPostingTimes: [
      { day: 'Monday', times: ['10:00 AM', '2:00 PM'] },
      { day: 'Wednesday', times: ['10:00 AM', '2:00 PM'] },
      { day: 'Friday', times: ['10:00 AM'] },
    ],
    reasoning: `Focus on building trust with helpful ${industry.toLowerCase()} content and regular updates from ${companyName}.`,
  };

  if (!CLAUDE_API_KEY) {
    console.error('CLAUDE_API_KEY not configured for generateMarketingStrategy');
    return defaultStrategy;
  }
  
  const prompt = `Create a marketing strategy for ${companyName}, a ${industry} company. ${description}

Provide:
1. Recommended social media platforms (2-4)
2. Posting frequency (e.g., "3-5 times per week")
3. Content mix percentages (educational, promotional, entertaining - must sum to 100)
4. Best posting times (2-3 day/time combinations)
5. Brief reasoning (2-3 sentences)`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('Claude marketing strategy error:', response.status, errorText);
      return defaultStrategy;
    }

    const data = await response.json();
    
    if (!data || typeof data !== 'object') {
      console.error('Invalid data structure from Claude for marketing strategy');
      return defaultStrategy;
    }
    
    const content: string | undefined = data.content?.[0]?.text;

    if (!content || typeof content !== 'string') {
      console.error('No valid content returned from Claude for marketing strategy');
      return defaultStrategy;
    }

    // For now, return the default structure with Claude reasoning
    return {
      ...defaultStrategy,
      reasoning: content.slice(0, 200),
    };
  } catch (error) {
    console.error('Error generating marketing strategy with Claude:', error);
    return defaultStrategy;
  }
}

async function populateBrandKit(supabase: any, userId: string, basicData: any, websiteUrl: string, scrapingSucceeded: boolean) {
  const colors = basicData.colors || {};
  const urlDomain = new URL(websiteUrl).hostname.replace('www.', '');
  const defaultCompanyName = urlDomain.split('.')[0].charAt(0).toUpperCase() + urlDomain.split('.')[0].slice(1);
  
  console.log('populateBrandKit - Logo URL:', basicData.logoUrl);
  
  const brandKit = {
    companyName: basicData.companyName || defaultCompanyName,
    industry: basicData.industry || basicData.suggestedIndustry || 'Business',
    description: basicData.description || `A company with website at ${urlDomain}`,
    logoUrl: basicData.logoUrl || null,
    primaryColor: colors.primary || '#6366f1',
    secondaryColor: colors.secondary || '#8b5cf6',
    accentColor: colors.accent || '#ec4899',
    tagline: basicData.tagline || `Welcome to ${defaultCompanyName}`,
    websiteUrl: websiteUrl,
    scraped_data: scrapingSucceeded ? basicData : null,
    colors: [colors.primary, colors.secondary, colors.accent].filter(Boolean)
  };

  console.log('Saving brand kit with logo:', brandKit.logoUrl);

  await supabase
    .from('user_profiles')
    .upsert({
      id: userId,
      company_name: brandKit.companyName,
      industry: brandKit.industry,
      description: brandKit.description,
      logo_url: brandKit.logoUrl,
      primary_color: brandKit.primaryColor,
      secondary_color: brandKit.secondaryColor,
      accent_color: brandKit.accentColor,
      tagline: brandKit.tagline,
      website_url: brandKit.websiteUrl,
      scraped_data: brandKit.scraped_data,
    }, {
      onConflict: 'id'
    });

  return brandKit;
}

async function saveGeneratedContent(supabase: any, userId: string, posts: any[], blogIdeas: string[]) {
  // Save social posts to posting_queue as samples
  const postsToInsert = posts.map(post => ({
    user_id: userId,
    content: post.caption,
    platforms: [post.platform.toLowerCase()],
    integration_ids: [],
    scheduled_for: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    is_sample: true,
    status: 'pending'
  }));

  await supabase
    .from('posting_queue')
    .insert(postsToInsert);

  // Save blog ideas to content_history as samples
  const blogToInsert = blogIdeas.map(idea => ({
    user_id: userId,
    topic: idea,
    content_type: 'blog',
    generated_content: idea,
    is_sample: true
  }));

  await supabase
    .from('content_history')
    .insert(blogToInsert);
}
