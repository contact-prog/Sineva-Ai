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
    const { originalContent, editInstruction, contentType } = await req.json();

    console.log(`Editing ${contentType} content with instruction: ${editInstruction}`);

    // Get authorization header
    const authHeader = req.headers.get('authorization');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader || '' } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();

    // Get Brand Kit for context
    let brandVoice = '';
    if (user) {
      const { data: profile } = await supabaseClient
        .from('user_profiles')
        .select('brand_voice, company_name')
        .eq('id', user.id)
        .single();
      
      if (profile?.brand_voice) {
        brandVoice = profile.brand_voice;
      }
    }

    const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');
    if (!claudeApiKey) {
      throw new Error('CLAUDE_API_KEY not configured');
    }

    const systemPrompt = `You are an expert content editor. Your task is to edit content based on user instructions while maintaining quality and coherence.

${brandVoice ? `Brand Voice: ${brandVoice}\n` : ''}
CRITICAL RULES:
- Apply ONLY the requested changes
- Maintain the original structure unless asked to change it
- Keep the same content type and format
- Preserve any markdown formatting
- Don't add explanations, just return the edited content

Content Type: ${contentType}`;

    const userPrompt = `Original Content:
${originalContent}

Edit Instruction: ${editInstruction}

Return ONLY the edited content, nothing else.`;

    // Use Claude Sonnet 4 with retry logic and validation
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
            body: JSON.stringify({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 4096,
              temperature: 0.7,
              system: systemPrompt,
              messages: [{
                role: 'user',
                content: userPrompt
              }]
            })
          }
        );

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
          console.error('Claude API error:', errorText);
          
          let errorMessage = `AI error (${response.status})`;
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
      console.error('Invalid response structure:', JSON.stringify(data));
      
      if (data.stop_reason === 'end_turn' && !data.content?.[0]?.text) {
        throw new Error('AI returned empty response. Please try again.');
      }
      
      throw new Error('Invalid AI response. Please try again.');
    }
    
    const editedContent = data.content[0].text;
    const tokenUsage = data.usage;
    
    console.log(`Content edited successfully. Length: ${editedContent.length} characters`);
    console.log(`Token usage - Input: ${tokenUsage?.input_tokens || 'N/A'}, Output: ${tokenUsage?.output_tokens || 'N/A'}`);

    return new Response(
      JSON.stringify({ 
        editedContent,
        instruction: editInstruction
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error editing content:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
