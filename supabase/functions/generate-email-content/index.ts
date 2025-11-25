import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();

    console.log("Generating email for prompt:", prompt);

    const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');
    if (!claudeApiKey) {
      throw new Error('CLAUDE_API_KEY not configured');
    }
    
    // Use Claude Sonnet 4 with retry logic for rate limits
    const endpoint = 'https://api.anthropic.com/v1/messages';
    
    let response: Response | undefined;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "x-api-key": claudeApiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4096,
            temperature: 0.7,
            system: "You are a professional email writing assistant. Generate professional, clear, and engaging email content.",
            messages: [{
              role: "user",
              content: `Generate email content based on this request: ${prompt}

Provide both a concise subject line and a well-structured email body. Format your response as JSON:
{
  "subject": "your subject line here",
  "body": "your email body here"
}`
            }]
          }),
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
          console.error("Claude API error:", response.status, errorText);
          
          let errorMessage = `AI service error (${response.status})`;
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
    
    // Validate response structure
    if (!data.content?.[0]?.text) {
      console.error("Invalid Claude response:", JSON.stringify(data));
      
      if (data.stop_reason === 'end_turn' && !data.content?.[0]?.text) {
        throw new Error('AI returned empty response. Please try again.');
      }
      
      throw new Error("Invalid AI response. Please try again.");
    }
    
    const content = data.content[0].text;
    const tokenUsage = data.usage;
    
    console.log("AI response received");
    console.log(`Token usage - Input: ${tokenUsage?.input_tokens || 'N/A'}, Output: ${tokenUsage?.output_tokens || 'N/A'}`);

    // Extract and validate JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Failed to extract JSON from response:", content);
      throw new Error("AI returned invalid format. Please try again.");
    }

    let result;
    try {
      result = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error("Failed to parse AI response. Please try again.");
    }
    
    // Validate required fields
    if (!result.subject || !result.body) {
      throw new Error("Incomplete email generated. Please try again.");
    }
    
    return new Response(
      JSON.stringify({
        subject: result.subject,
        body: result.body
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in generate-email-content:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate email" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
