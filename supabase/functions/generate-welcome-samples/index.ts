import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId } = await req.json();

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Get user profile to customize samples
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_name, industry, brand_voice')
      .eq('id', userId)
      .single();

    const companyName = profile?.company_name || 'Your Company';
    const industry = profile?.industry || 'business';
    const brandVoice = profile?.brand_voice || 'professional';

    // Generate sample graphic metadata (we'll use a placeholder since we can't call image gen from here)
    await supabase.from('brand_assets').insert({
      user_id: userId,
      asset_type: 'social_post',
      platform: 'instagram',
      title: `Sample ${industry} Post`,
      image_url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1080&h=1080&fit=crop', // Placeholder
      is_sample: true,
      metadata: {
        prompt: `Professional ${industry} marketing graphic for ${companyName}`,
        generated_for_tour: true
      }
    });

    // Generate sample blog content
    const sampleBlogContent = `
# Welcome to ${companyName}'s Blog

This is a sample blog post to demonstrate what Sineva AI can create for your ${industry} business.

## Why ${industry} Matters

In today's fast-paced digital landscape, ${industry} professionals need efficient tools to stay ahead. With Sineva AI, you can streamline your content creation process and focus on what truly matters.

## Key Benefits

- **Time Savings**: Generate content in seconds, not hours
- **Brand Consistency**: Maintain your unique ${brandVoice} voice across all platforms
- **Data-Driven**: Leverage AI insights to optimize your messaging

This sample demonstrates the quality and structure you can expect from AI-generated blog posts.
    `.trim();

    await supabase.from('content_history').insert({
      user_id: userId,
      content_type: 'blog_post',
      topic: `Getting Started with ${industry} Marketing`,
      generated_content: sampleBlogContent,
      tone: brandVoice,
      is_sample: true,
      quality_metrics: {
        readability_score: 85,
        seo_score: 78
      }
    });

    // Generate sample social post ideas
    const samplePosts = [
      `Exciting things happening at ${companyName}! 🚀 We're revolutionizing ${industry}. #${industry} #Innovation`,
      `Pro tip for ${industry} professionals: Leverage AI to boost your productivity by 10x. Learn more at our blog!`,
      `Behind the scenes at ${companyName}: How we're using technology to transform ${industry}. 💡`
    ];

    for (const content of samplePosts) {
      await supabase.from('posting_queue').insert({
        user_id: userId,
        content,
        platforms: ['instagram', 'facebook', 'twitter'],
        integration_ids: [],
        scheduled_for: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: 'scheduled',
        is_sample: true,
        tags: ['sample', 'demo']
      });
    }

    console.log(`Generated welcome samples for user ${userId}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Sample content generated' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating samples:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
