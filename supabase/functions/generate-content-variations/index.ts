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
      originalContent,
      topic,
      contentType, 
      numberOfVariations = 3,
      variationAngles = ['different tone', 'different angle', 'different style']
    } = await req.json();

    console.log(`Generating ${numberOfVariations} variations for ${contentType} content`);

    const authHeader = req.headers.get('authorization');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader || '' } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();

    // Get Brand Kit
    let brandKit: any = null;
    if (user) {
      const { data: profile } = await supabaseClient
        .from('user_profiles')
        .select('company_name, brand_voice, target_audience, industry')
        .eq('id', user.id)
        .single();
      
      brandKit = profile;
    }

    const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');
    if (!claudeApiKey) {
      throw new Error('CLAUDE_API_KEY not configured');
    }

    // Generate variations in parallel
    const variationPromises = variationAngles.slice(0, numberOfVariations).map(async (angle: string, index: number) => {
      const systemPrompt = `You are an expert content writer creating variations of existing content.

${brandKit ? `Brand Context:
- Company: ${brandKit.company_name || 'N/A'}
- Brand Voice: ${brandKit.brand_voice || 'professional'}
- Target Audience: ${brandKit.target_audience || 'general'}
- Industry: ${brandKit.industry || 'N/A'}
` : ''}

TASK: Create a variation with ${angle}
Content Type: ${contentType}
Topic: ${topic}

RULES:
- Maintain the same core message
- Keep similar length
- Use different wording, structure, or perspective
- Ensure it's distinct from the original
- Return ONLY the content, no explanations`;

      const userPrompt = `Original Content:
${originalContent}

Create Variation #${index + 1} with ${angle}:`;

      // Use Claude Sonnet 4 with retry logic
      let response: Response | undefined;
      let retryAttempt = 0;
      const maxAttempts = 2; // Fewer retries for parallel requests
      
      while (retryAttempt < maxAttempts) {
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
            }
          );

          if (response.status === 429) {
            retryAttempt++;
            if (retryAttempt >= maxAttempts) {
              console.error(`Variation ${index + 1} rate limited after retries`);
              return null;
            }
            await new Promise(resolve => setTimeout(resolve, 2000 * retryAttempt));
            continue;
          }

          if (!response.ok) {
            console.error(`Variation ${index + 1} failed:`, response.status);
            return null;
          }

          break;
        } catch (error) {
          console.error(`Variation ${index + 1} error:`, error);
          if (retryAttempt >= maxAttempts - 1) return null;
          retryAttempt++;
          await new Promise(resolve => setTimeout(resolve, 2000 * retryAttempt));
        }
      }

      const data = await response!.json();
      
      // Validate response
      if (!data.content?.[0]?.text) {
        console.error(`Variation ${index + 1} invalid response:`, JSON.stringify(data));
        return null;
      }
      
      const content = data.content[0].text;
      const tokenUsage = data.usage;
      
      console.log(`Variation ${index + 1} generated. Tokens: ${tokenUsage?.output_tokens || 'N/A'}`);
      
      return {
        variationNumber: index + 1,
        content: content,
        angle: angle,
        tone: getToneFromAngle(angle)
      };
    });

    const variations = (await Promise.all(variationPromises)).filter(v => v !== null);

    // Save variations to database if user is authenticated
    if (user && variations.length > 0) {
      try {
        // Store parent content first
        const { data: parentContent, error: parentError } = await supabaseClient
          .from('content_history')
          .insert({
            user_id: user.id,
            content_type: contentType,
            topic: topic,
            tone: 'original',
            length: 'medium',
            generated_content: originalContent
          })
          .select()
          .single();

        if (!parentError && parentContent) {
          // Store variations linked to parent
          const variationRecords = variations.map(v => ({
            parent_content_id: parentContent.id,
            variation_number: v!.variationNumber,
            content: v!.content,
            tone: v!.tone,
            framework: v!.angle
          }));

          // Note: content_variations table will be created in migration
          console.log('Variations generated successfully');
        }
      } catch (saveError) {
        console.error('Failed to save variations:', saveError);
        // Don't fail the request if save fails
      }
    }

    return new Response(
      JSON.stringify({ 
        variations,
        count: variations.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating variations:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getToneFromAngle(angle: string): string {
  if (angle.includes('professional')) return 'professional';
  if (angle.includes('casual')) return 'casual';
  if (angle.includes('enthusiastic')) return 'enthusiastic';
  if (angle.includes('formal')) return 'formal';
  return 'varied';
}
