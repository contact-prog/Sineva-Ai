import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SEOAnalysis {
  overallScore: number;
  metaTitle: string;
  metaDescription: string;
  h1Heading: string;
  h2Headings: string[];
  readabilityScore: number;
  wordCount: number;
  keywordDensity: { keyword: string; density: number }[];
  recommendations: string[];
  strengths: string[];
  warnings: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, targetKeyword } = await req.json();

    console.log('Analyzing SEO for content with target keyword:', targetKeyword);

    const authHeader = req.headers.get('authorization');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader || '' } } }
    );

    await supabaseClient.auth.getUser();

    // Basic analysis
    const wordCount = content.split(/\s+/).length;
    const readability = calculateFleschKincaid(content);
    
    // Extract existing headings
    const h1Match = content.match(/^#\s+(.+)$/m);
    const h2Matches = content.match(/^##\s+(.+)$/gm) || [];
    
    // Get Claude API key
    const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');
    if (!claudeApiKey) {
      throw new Error('CLAUDE_API_KEY not configured');
    }

    // Use AI to generate SEO recommendations
    const systemPrompt = `You are an SEO expert. Analyze the following blog content and provide SEO optimization recommendations.

Target Keyword: ${targetKeyword || 'Not specified'}

Provide your analysis in this EXACT JSON format:
{
  "metaTitle": "Optimized meta title (max 60 chars)",
  "metaDescription": "Optimized meta description (max 160 chars)",
  "h1Heading": "Recommended H1 heading",
  "h2Headings": ["H2 heading 1", "H2 heading 2", "H2 heading 3"],
  "keywordDensity": [
    {"keyword": "main keyword", "density": 2.5},
    {"keyword": "related keyword", "density": 1.8}
  ],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "strengths": ["Strength 1", "Strength 2"],
  "warnings": ["Warning 1", "Warning 2"]
}`;

    const userPrompt = `Content to analyze:
${content}

Word Count: ${wordCount}
Readability Score: ${readability}
Current H1: ${h1Match ? h1Match[1] : 'None'}
Current H2s: ${h2Matches.length}`;

    const response = await fetch(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'x-api-key': claudeApiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          temperature: 0.3,
          system: systemPrompt,
          messages: [{
            role: 'user',
            content: userPrompt
          }]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Check if response has the expected structure
    if (!data.content?.[0]?.text) {
      console.error('Invalid Claude API response structure:', JSON.stringify(data));
      throw new Error('Invalid response from Claude API');
    }
    
    const aiAnalysisText = data.content[0].text;
    
    // Extract JSON from AI response
    let aiAnalysis;
    try {
      const jsonMatch = aiAnalysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiAnalysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback to basic analysis
      aiAnalysis = {
        metaTitle: h1Match ? h1Match[1].substring(0, 60) : 'Add a compelling title',
        metaDescription: 'Add a meta description for this content',
        h1Heading: h1Match ? h1Match[1] : 'Add H1 heading',
        h2Headings: h2Matches.map((h: string) => h.replace(/^##\s+/, '')),
        keywordDensity: [],
        recommendations: ['Optimize title and meta description', 'Add more internal links'],
        strengths: ['Good content length'],
        warnings: ['Missing meta information']
      };
    }

    // Calculate overall score
    const overallScore = calculateSEOScore({
      hasH1: !!h1Match,
      h2Count: h2Matches.length,
      wordCount,
      readability,
      hasMetaTitle: aiAnalysis.metaTitle.length > 0,
      hasMetaDescription: aiAnalysis.metaDescription.length > 0
    });

    const seoAnalysis: SEOAnalysis = {
      overallScore,
      metaTitle: aiAnalysis.metaTitle,
      metaDescription: aiAnalysis.metaDescription,
      h1Heading: aiAnalysis.h1Heading,
      h2Headings: aiAnalysis.h2Headings,
      readabilityScore: readability,
      wordCount,
      keywordDensity: aiAnalysis.keywordDensity || [],
      recommendations: aiAnalysis.recommendations || [],
      strengths: aiAnalysis.strengths || [],
      warnings: aiAnalysis.warnings || []
    };

    return new Response(
      JSON.stringify(seoAnalysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error analyzing SEO:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateFleschKincaid(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const words = text.split(/\s+/).length;
  const syllables = countSyllables(text);
  
  if (sentences === 0 || words === 0) return 0;
  
  const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
  return Math.max(0, Math.min(100, Math.round(score)));
}

function countSyllables(text: string): number {
  const words = text.toLowerCase().split(/\s+/);
  let syllableCount = 0;
  
  for (const word of words) {
    const vowelGroups = word.match(/[aeiouy]+/g);
    if (vowelGroups) {
      syllableCount += vowelGroups.length;
      // Adjust for silent 'e'
      if (word.endsWith('e') && vowelGroups.length > 1) {
        syllableCount--;
      }
    } else {
      syllableCount++; // At least one syllable per word
    }
  }
  
  return syllableCount;
}

function calculateSEOScore(factors: {
  hasH1: boolean;
  h2Count: number;
  wordCount: number;
  readability: number;
  hasMetaTitle: boolean;
  hasMetaDescription: boolean;
}): number {
  let score = 0;
  
  // H1 heading (15 points)
  if (factors.hasH1) score += 15;
  
  // H2 headings (15 points)
  if (factors.h2Count >= 3) score += 15;
  else if (factors.h2Count >= 1) score += 10;
  
  // Word count (20 points)
  if (factors.wordCount >= 1000) score += 20;
  else if (factors.wordCount >= 500) score += 15;
  else if (factors.wordCount >= 300) score += 10;
  
  // Readability (20 points)
  if (factors.readability >= 60) score += 20;
  else if (factors.readability >= 50) score += 15;
  else if (factors.readability >= 40) score += 10;
  
  // Meta title (15 points)
  if (factors.hasMetaTitle) score += 15;
  
  // Meta description (15 points)
  if (factors.hasMetaDescription) score += 15;
  
  return score;
}
