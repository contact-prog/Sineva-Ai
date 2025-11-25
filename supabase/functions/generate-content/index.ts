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
    const { 
      contentType, 
      topic, 
      tone, 
      length, 
      additionalContext,
      useResearch = false,
      templateFramework = 'none',
      captionPlatform
    } = await req.json();

    console.log(`Generating ${contentType} content for topic: ${topic}`);
    console.log(`Research mode: ${useResearch}, Template: ${templateFramework}`);

    // Get Supabase client and resolve authenticated user (if any)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization');
    let user: any = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      const { data, error } = await supabaseClient.auth.getUser(token);
      if (error) {
        console.error('Failed to resolve user for generate-content:', error);
      } else {
        user = data.user;
      }
    } else {
      console.log('No Authorization header found for generate-content; proceeding without user');
    }

    // Fetch user's Brand Kit from user_profiles
    let brandKit: any = null;
    if (user) {
      const { data: profile } = await supabaseClient
        .from('user_profiles')
        .select('company_name, brand_voice, target_audience, tagline, industry, goals')
        .eq('id', user.id)
        .single();
      
      brandKit = profile;
      console.log('Loaded Brand Kit for user');
    }

    // Research phase (if enabled)
    let researchInsights: any = null;
    if (useResearch && user) {
      console.log('Initiating research phase...');
      const { data: researchData, error: researchError } = await supabaseClient.functions.invoke(
        'research-agent',
        { 
          body: { 
            query: `Research "${topic}" for creating ${contentType} content. Focus on latest trends, key facts, and engaging angles.`,
            depth: 'standard',
            includeCompetitors: false
          } 
        }
      );

      if (!researchError && researchData?.insights) {
        researchInsights = researchData.insights;
        console.log('Research completed successfully');
      } else {
        console.warn('Research failed, proceeding without insights:', researchError);
      }
    }

    // Usage limits disabled for development - no blocking
    console.log('Skipping usage limit check (development mode)');

    // Get Claude API key
    const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');
    if (!claudeApiKey) {
      throw new Error('CLAUDE_API_KEY not configured');
    }

    const systemPrompt = getSystemPrompt(contentType, tone, length, templateFramework, brandKit, captionPlatform);
    const userPrompt = getUserPrompt(contentType, topic, additionalContext, researchInsights, captionPlatform);

    // Use Claude Sonnet 4 for high-quality content generation
    const modelName = 'claude-sonnet-4-20250514';
    console.log(`Using Claude API model: ${modelName} for ${contentType} content (max tokens: ${getMaxTokens(length)})`);

    const requestBody = {
      model: modelName,
      max_tokens: getMaxTokens(length),
      temperature: 0.8,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: userPrompt
      }]
    };

    console.log(`Calling Claude API with max tokens: ${getMaxTokens(length)}`);
    
    // Use Claude API endpoint with retry logic
    let response: Response | undefined;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        response = await fetch(
          'https://api.anthropic.com/v1/messages',
          {
            method: 'POST',
            headers: {
              'x-api-key': claudeApiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
            body: JSON.stringify(requestBody)
          }
        );

        console.log(`Claude API response status: ${response.status}`);

        // Handle rate limiting with exponential backoff
        if (response.status === 429) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw new Error('Rate limit exceeded. Please try again in a few moments.');
          }
          const waitTime = Math.pow(2, retryCount) * 1000; // Exponential backoff
          console.log(`Rate limited. Retrying in ${waitTime}ms (attempt ${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        // Handle other errors
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Claude API error response:', errorText);
          
          // Parse error for better user feedback
          let errorMessage = `Claude API error (${response.status})`;
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

        break; // Success, exit retry loop
      } catch (error) {
        if (retryCount >= maxRetries - 1) {
          throw error;
        }
        retryCount++;
        const waitTime = Math.pow(2, retryCount) * 1000;
        console.log(`Request failed. Retrying in ${waitTime}ms (attempt ${retryCount}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    const data = await response!.json();
    
    // Validate response structure
    if (!data.content?.[0]?.text) {
      console.error('Invalid response structure from Claude API:', JSON.stringify(data));
      
      // Check for content filtering
      if (data.stop_reason === 'end_turn' && !data.content?.[0]?.text) {
        throw new Error('AI returned empty response. Please try again.');
      }
      
      throw new Error('Invalid or empty response from AI. Please try again.');
    }

    const generatedText = data.content[0].text;
    const tokenUsage = data.usage;
    
    console.log(`Generated content length: ${generatedText.length} characters`);
    console.log(`Token usage - Input: ${tokenUsage?.input_tokens || 'N/A'}, Output: ${tokenUsage?.output_tokens || 'N/A'}`);

    // Extract metadata for blog posts
    let metaDescription = '';
    let seoKeywords: string[] = [];
    let contentWithoutMeta = generatedText;

    if (contentType === 'blog') {
      // Extract meta description
      const metaMatch = generatedText.match(/META_DESCRIPTION:\s*(.+?)(?:\n|$)/i);
      if (metaMatch) {
        metaDescription = metaMatch[1].trim();
        contentWithoutMeta = contentWithoutMeta.replace(/META_DESCRIPTION:.+?(?:\n|$)/i, '').trim();
      }

      // Extract SEO keywords
      const keywordsMatch = generatedText.match(/SEO_KEYWORDS:\s*(.+?)(?:\n|$)/i);
      if (keywordsMatch) {
        seoKeywords = keywordsMatch[1].split(',').map((k: string) => k.trim());
        contentWithoutMeta = contentWithoutMeta.replace(/SEO_KEYWORDS:.+?(?:\n|$)/i, '').trim();
      }
    }

    // Calculate readability score for blog posts
    const readabilityScore = contentType === 'blog' ? calculateReadabilityScore(contentWithoutMeta) : null;

    // Save to content_history if user is authenticated
    if (user) {
      try {
        const qualityMetrics: any = {};
        if (contentType === 'blog') {
          qualityMetrics.readability_score = readabilityScore;
          qualityMetrics.word_count = contentWithoutMeta.split(/\s+/).filter((w: string) => w.length > 0).length;
          if (metaDescription) qualityMetrics.meta_description = metaDescription;
          if (seoKeywords.length > 0) qualityMetrics.seo_keywords = seoKeywords;
        }

        await supabaseClient.from('content_history').insert({
          user_id: user.id,
          content_type: contentType,
          topic,
          tone,
          length,
          generated_content: contentWithoutMeta,
          research_insights: researchInsights || null,
          template_used: templateFramework !== 'none' ? templateFramework : null,
          quality_metrics: Object.keys(qualityMetrics).length > 0 ? qualityMetrics : null
        });
        console.log('Content saved to history with metadata');

        // If it's a blog, also save to blogs table
        if (contentType === 'blog') {
          // Generate excerpt (first 150 characters)
          const excerpt = contentWithoutMeta.substring(0, 150) + '...';
          
          await supabaseClient.from('blogs').insert({
            user_id: user.id,
            topic,
            content: contentWithoutMeta,
            excerpt,
            status: 'draft',
            meta_description: metaDescription || null,
            keywords: seoKeywords.length > 0 ? seoKeywords : null,
            ai_generated: true,
            generation_metadata: {
              tone,
              length,
              template: templateFramework !== 'none' ? templateFramework : null,
              research_used: useResearch,
              readability_score: readabilityScore
            }
          });
          console.log('Blog saved to blogs table');
        }

        // Increment usage counter (non-blocking, for analytics only)
        supabaseClient.functions.invoke('increment-usage', {
          body: {
            serviceType: 'content',
            operationType: contentType,
            creditsUsed: 1,
            metadata: { length, tone }
          }
        }).catch(err => console.warn('Usage increment failed (non-critical):', err));
      } catch (historyError) {
        console.error('Failed to save to content history:', historyError);
        // Don't fail the request if history save fails
      }
    }

    return new Response(
      JSON.stringify({ 
        content: contentWithoutMeta,
        contentType,
        topic,
        metaDescription: metaDescription || undefined,
        seoKeywords: seoKeywords.length > 0 ? seoKeywords : undefined,
        readabilityScore: readabilityScore || undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating content:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getSystemPrompt(
  contentType: string, 
  tone: string, 
  length: string, 
  templateFramework: string = 'none',
  brandKit: any = null,
  captionPlatform?: string
): string {
  // Platform-specific character limits for captions
  const captionLimits: Record<string, number> = {
    instagram: 150,
    twitter: 280,
    facebook: 80,
    linkedin: 200,
    tiktok: 150
  };

  const prompts: Record<string, string> = {
    blog: `You are an expert blog writer. Create engaging, well-structured blog posts with:
- A compelling H1 title
- Clear H2 section headings (4-6 sections)
- H3 subheadings where appropriate for detailed sections
- Well-structured paragraphs with strong topic sentences
- SEO-optimized content with natural keyword integration
- Engaging introduction and strong conclusion
- Use markdown formatting for all headings

At the end of your response, include:
META_DESCRIPTION: [Write a compelling 150-160 character meta description]
SEO_KEYWORDS: [List 5-8 relevant SEO keywords, comma-separated]`,
    social: `You are a social media expert. Create engaging, concise posts optimized for social media platforms. Include relevant hashtags and emojis where appropriate.`,
    email: `You are a professional email copywriter. Create clear, persuasive email content with a strong subject line and compelling body text. Structure emails with:
- A clear, attention-grabbing subject line
- Professional greeting
- Well-organized paragraphs
- Strong call-to-action
- Professional closing`,
    caption: captionPlatform 
      ? `You are a social media caption specialist for ${captionPlatform.toUpperCase()}. Create catchy, engaging captions optimized for ${captionPlatform} that drive engagement. CRITICAL: Keep the caption under ${captionLimits[captionPlatform] || 150} characters (including spaces and hashtags). Make every character count!`
      : `You are a social media caption specialist. Create catchy, engaging captions that drive engagement and include relevant hashtags.`,
    article: `You are a professional article writer. Create informative, well-researched articles with proper structure and citations where relevant.`
  };

  let prompt = prompts[contentType] || prompts.blog;
  
  // Add Brand Kit context
  if (brandKit) {
    prompt += `\n\nBRAND CONTEXT:`;
    if (brandKit.company_name) prompt += `\n- Company: ${brandKit.company_name}`;
    if (brandKit.brand_voice) prompt += `\n- Brand Voice: ${brandKit.brand_voice}`;
    if (brandKit.target_audience) prompt += `\n- Target Audience: ${brandKit.target_audience}`;
    if (brandKit.industry) prompt += `\n- Industry: ${brandKit.industry}`;
    if (brandKit.tagline) prompt += `\n- Tagline: ${brandKit.tagline}`;
    prompt += `\n\nALWAYS align content with this brand identity and voice.`;
  }

  // Add template framework instructions
  if (templateFramework && templateFramework !== 'none') {
    const frameworkInstructions: Record<string, string> = {
      aida: `\n\nFollow the AIDA framework:
1. Attention: Start with a compelling hook
2. Interest: Build curiosity with engaging information
3. Desire: Show benefits and create emotional connection
4. Action: Clear call-to-action`,
      pas: `\n\nFollow the PAS framework:
1. Problem: Identify the pain point
2. Agitate: Amplify the problem's impact
3. Solution: Present the solution`,
      fab: `\n\nFollow the FAB framework:
1. Features: List key features
2. Advantages: Explain how features work
3. Benefits: Show real-world value`,
      'before-after-bridge': `\n\nFollow the Before-After-Bridge framework:
1. Before: Current problematic situation
2. After: Ideal future state
3. Bridge: How to get from before to after`,
      '4cs': `\n\nFollow the 4 C's framework:
1. Clear: Easy to understand
2. Concise: No unnecessary words
3. Compelling: Engaging content
4. Credible: Trustworthy and factual`,
      storytelling: `\n\nFollow the Storytelling framework:
1. Setup: Introduce context
2. Conflict: Present the challenge
3. Resolution: Show how it was overcome
4. Lesson: Key takeaway`,
      scqa: `\n\nFollow the SCQA framework:
1. Situation: Set the context
2. Complication: Introduce the problem
3. Question: Pose the key question
4. Answer: Provide the solution`,
      'hook-story-offer': `\n\nFollow the Hook-Story-Offer framework:
1. Hook: Grab attention immediately
2. Story: Share relatable narrative
3. Offer: Present clear value proposition`
    };

    prompt += frameworkInstructions[templateFramework] || '';
  }

  // For captions, skip the length guide as character limit is already specified
  if (contentType === 'caption') {
    prompt += `\n\nTone: ${tone}\n\nProvide only the caption text, no additional commentary.`;
  } else if (contentType === 'email') {
    // Email-specific length guidance
    const emailLengthGuide: Record<string, string> = {
      brief: '1-2 concise paragraphs',
      standard: '3-4 well-structured paragraphs',
      detailed: '5-6 comprehensive paragraphs',
      comprehensive: '7 or more detailed paragraphs'
    };
    
    prompt += `\n\nTone: ${tone}\nIMPORTANT: Create an email with ${emailLengthGuide[length] || '3-4 well-structured paragraphs'}. Include a compelling subject line at the top.\n\nProvide only the email content (subject line and body), no additional commentary.`;
  } else {
    // General content length guidance
    const lengthGuide: Record<string, string> = {
      short: '300-500',
      medium: '600-800',
      long: '1000-1500',
      very_long: '2000+'
    };
    
    prompt += `\n\nTone: ${tone}\nIMPORTANT: Generate ${lengthGuide[length] || '600-800'} words. This is a MINIMUM requirement - write comprehensive, detailed content that meets this word count.\n\nProvide only the content, no additional commentary.`;
  }
  
  return prompt;
}

function getUserPrompt(
  contentType: string, 
  topic: string, 
  additionalContext?: string,
  researchInsights?: any,
  captionPlatform?: string
): string {
  let prompt = `Topic: ${topic}`;
  
  // Add research insights if available
  if (researchInsights) {
    prompt += `\n\nRESEARCH INSIGHTS:`;
    if (researchInsights.keyFindings?.length > 0) {
      prompt += `\n\nKey Findings:\n${researchInsights.keyFindings.map((f: string) => `- ${f}`).join('\n')}`;
    }
    if (researchInsights.trendingTopics?.length > 0) {
      prompt += `\n\nTrending Topics:\n${researchInsights.trendingTopics.map((t: string) => `- ${t}`).join('\n')}`;
    }
    if (researchInsights.recommendations?.length > 0) {
      prompt += `\n\nRecommendations:\n${researchInsights.recommendations.map((r: string) => `- ${r}`).join('\n')}`;
    }
    prompt += `\n\nUse these insights to create data-driven, informed content.`;
  }
  
  if (additionalContext) {
    prompt += `\n\nAdditional context: ${additionalContext}`;
  }

  const typeInstructions: Record<string, string> = {
    blog: '\n\nCreate a complete blog post with an engaging title, introduction, main sections with headings, and a conclusion.',
    social: '\n\nCreate a compelling social media post that grabs attention and encourages engagement.',
    email: '\n\nCreate an email with a subject line and body text that drives action.',
    caption: captionPlatform 
      ? `\n\nCreate a short, impactful ${captionPlatform} caption. Be concise and engaging. Include 2-3 relevant hashtags at the end.`
      : '\n\nCreate an engaging social media caption with relevant hashtags.',
    article: '\n\nCreate a comprehensive article with proper structure and informative content.'
  };

  prompt += typeInstructions[contentType] || typeInstructions.blog;
  return prompt;
}

function getMaxTokens(length: string): number {
  // Caption platforms use the platform name as the length parameter
  const captionPlatforms = ['instagram', 'twitter', 'facebook', 'linkedin', 'tiktok'];
  if (captionPlatforms.includes(length)) {
    return 500; // Short token limit for captions
  }
  
  // Email-specific length tokens
  const emailLengths: Record<string, number> = {
    brief: 800,        // 1-2 paragraphs
    standard: 1500,    // 3-4 paragraphs
    detailed: 2500,    // 5-6 paragraphs
    comprehensive: 4000 // 7+ paragraphs
  };
  
  // General content length tokens
  const tokens: Record<string, number> = {
    short: 1500,
    medium: 3000,
    long: 5000,
    very_long: 8192,
    ...emailLengths
  };
  return tokens[length] || 3000;
}

function calculateReadabilityScore(text: string): number {
  // Remove markdown and HTML
  const cleanText = text.replace(/[#*_\[\]()]/g, '').replace(/<[^>]*>/g, '');
  
  // Count sentences
  const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  
  // Count words
  const words = cleanText.split(/\s+/).filter(w => w.length > 0).length;
  
  // Count syllables (approximate)
  const syllables = cleanText.split(/\s+/).reduce((count, word) => {
    return count + countSyllables(word);
  }, 0);
  
  if (sentences === 0 || words === 0) return 0;
  
  // Flesch Reading Ease Score
  const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
  return Math.max(0, Math.min(100, Math.round(score)));
}

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;
  
  const vowels = 'aeiouy';
  let count = 0;
  let previousWasVowel = false;
  
  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i]);
    if (isVowel && !previousWasVowel) {
      count++;
    }
    previousWasVowel = isVowel;
  }
  
  // Adjust for silent 'e'
  if (word.endsWith('e')) {
    count--;
  }
  
  return Math.max(1, count);
}
