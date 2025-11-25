import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, platforms } = await req.json();
    console.log('Generate platform suite request:', { content: content?.substring(0, 100), platforms });

    if (!content || !platforms || platforms.length === 0) {
      throw new Error('Missing required fields: content or platforms');
    }

    // Get user context
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Fetch brand kit
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('company_name, brand_voice, target_audience, industry')
      .eq('id', user.id)
      .single();

    // Get Claude API key for direct API access
    const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');
    if (!claudeApiKey) {
      throw new Error('CLAUDE_API_KEY not configured');
    }

    const endpoint = 'https://api.anthropic.com/v1/messages';

    const brandContext = profile ? `
Brand Context:
- Company: ${profile.company_name || 'N/A'}
- Brand Voice: ${profile.brand_voice || 'N/A'}
- Target Audience: ${profile.target_audience || 'N/A'}
- Industry: ${profile.industry || 'N/A'}
` : '';

    const systemPrompt = `You are an expert multi-platform content strategist. Generate a comprehensive content suite optimized for each platform.${brandContext}

Return a JSON object with this structure:
{
  "suite": {
    "platform_name": {
      "mainPost": "Primary post content",
      "caption": "Platform-optimized caption",
      "hashtags": ["tag1", "tag2", ...],
      "cta": "Call to action",
      "bestTime": "Recommended posting time",
      "contentTips": "Platform-specific tips"
    }
  }
}

Platform Guidelines:
- Twitter: Conversational, max 280 chars, 2-3 hashtags, engage with questions
- LinkedIn: Professional insights, 1300 chars ideal, industry-focused hashtags, thought leadership
- Instagram: Visual storytelling, emoji-friendly, 2200 char limit, 15-20 hashtags, first line hooks
- Facebook: Community-focused, 250 chars ideal, end with question, 2-3 hashtags
- TikTok: Trendy, short hooks, clear CTA, trending hashtags

For each platform, create:
1. Optimized content version
2. Platform-appropriate caption/hook
3. Strategic hashtags (5-15 depending on platform)
4. Compelling CTA
5. Best posting time recommendation
6. Quick content tips`;

    const userPrompt = `Original Content: "${content}"

Generate a complete content suite for: ${platforms.join(', ')}

Create platform-specific versions with captions, hashtags, CTAs, and timing recommendations.`;

    console.log('Calling Claude API for platform suite generation');

    let response: Response | undefined;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'x-api-key': claudeApiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            temperature: 0.9,
            system: systemPrompt,
            messages: [{
              role: 'user',
              content: userPrompt
            }]
          })
        });

        // Handle rate limiting
        if (response.status === 429) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw new Error('Rate limit exceeded. Please try again shortly.');
          }
          const waitTime = Math.pow(2, retryCount) * 1000;
          console.log(`Rate limited. Retrying in ${waitTime}ms`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Claude API error:', response.status, errorText);
          
          let errorMessage = `Platform suite generation failed (${response.status})`;
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.error?.message) {
              errorMessage = errorData.error.message;
            }
          } catch {
            errorMessage = errorText.substring(0, 200);
          }
          
          throw new Error(errorMessage);
        }

        break;
      } catch (error) {
        if (retryCount >= maxRetries - 1) throw error;
        retryCount++;
        const waitTime = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    const data = await response!.json();
    
    // Validate response
    if (!data.content?.[0]?.text) {
      console.error('Invalid Claude response:', JSON.stringify(data));
      
      if (data.stop_reason === 'end_turn' && !data.content?.[0]?.text) {
        throw new Error('AI returned empty response. Please try again.');
      }
      
      throw new Error('Invalid AI response. Please try again.');
    }
    
    const generatedText = data.content[0].text;
    const tokenUsage = data.usage;
    
    console.log('Generated platform suite:', generatedText.substring(0, 200));
    console.log(`Token usage - Input: ${tokenUsage?.input_tokens || 'N/A'}, Output: ${tokenUsage?.output_tokens || 'N/A'}`);

    // Parse and validate JSON from response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Failed to extract JSON from response:', generatedText);
      throw new Error('AI returned invalid format. Please try again.');
    }

    let suite;
    try {
      suite = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Failed to parse platform suite. Please try again.');
    }
    
    // Validate suite structure
    if (!suite.suite || typeof suite.suite !== 'object') {
      throw new Error('Invalid platform suite structure generated.');
    }

    return new Response(
      JSON.stringify({
        success: true,
        suite: suite.suite
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Platform suite generation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
