import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || undefined;

    // Supabase client – uses the request's auth token when present
    const supabaseOptions: any = {};
    if (authHeader) {
      supabaseOptions.global = { headers: { Authorization: authHeader } };
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      supabaseOptions,
    );

    // Try to get the authenticated user, but allow anonymous usage
    let userId: string | null = null;
    if (authHeader) {
      const { data: authData, error: userError } = await supabaseClient.auth.getUser();
      if (userError) {
        console.warn(
          "Error getting authenticated user, proceeding anonymously:",
          userError.message ?? userError,
        );
      } else if (authData?.user) {
        userId = authData.user.id;
      }
    }

    console.log("[generate-content-recommendations] userId:", userId ?? "anonymous");

    // User-context data (brand kit, history, performance)
    let profile: any = null;
    let contentHistory: any[] = [];
    let publishedPosts: any[] = [];
    let socialPosts: any[] = [];

    if (userId) {
      // Fetch user's brand kit
      const { data: profileData, error: profileError } = await supabaseClient
        .from("user_profiles")
        .select("company_name, brand_voice, target_audience, industry, goals")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.warn(
          "Error loading user profile for recommendations:",
          profileError.message ?? profileError,
        );
      } else {
        profile = profileData;
      }

      // Fetch recent content history
      const { data: historyData, error: historyError } = await supabaseClient
        .from("content_history")
        .select("content_type, topic, tone, quality_metrics, seo_score, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (historyError) {
        console.warn(
          "Error loading content history for recommendations:",
          historyError.message ?? historyError,
        );
      } else {
        contentHistory = historyData || [];
      }

      // Fetch published posts performance
      const { data: publishedData, error: publishedError } = await supabaseClient
        .from("published_posts")
        .select("content, likes, shares, comments, views, platform, published_at")
        .eq("user_id", userId)
        .order("published_at", { ascending: false })
        .limit(10);

      if (publishedError) {
        console.warn(
          "Error loading published posts for recommendations:",
          publishedError.message ?? publishedError,
        );
      } else {
        publishedPosts = publishedData || [];
      }

      // Fetch social posts performance
      const { data: socialData, error: socialError } = await supabaseClient
        .from("social_posts")
        .select("content, engagement_stats, status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (socialError) {
        console.warn(
          "Error loading social posts for recommendations:",
          socialError.message ?? socialError,
        );
      } else {
        socialPosts = socialData || [];
      }
    }

    // Analyze content patterns and performance
    const topPerformingContent = publishedPosts
      ?.sort((a, b) => {
        const engagementA = (a.likes || 0) + (a.shares || 0) * 2 + (a.comments || 0) * 3;
        const engagementB = (b.likes || 0) + (b.shares || 0) * 2 + (b.comments || 0) * 3;
        return engagementB - engagementA;
      })
      .slice(0, 3);

    const contentTypes = contentHistory
      ?.reduce((acc: any, item) => {
        acc[item.content_type] = (acc[item.content_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const recentTopics = contentHistory?.slice(0, 10).map((item) => item.topic) || [];

    const systemPrompt = `You are an AI content strategist and trend analyst. Analyze user data and generate personalized content recommendations.

${
      profile
        ? `BRAND CONTEXT:
- Company: ${profile.company_name || "N/A"}
- Industry: ${profile.industry || "N/A"}
- Brand Voice: ${profile.brand_voice || "N/A"}
- Target Audience: ${profile.target_audience || "N/A"}
- Goals: ${(profile.goals || []).join(", ") || "N/A"}
`
        : ""
    }

CONTENT HISTORY ANALYSIS:
- Total content pieces: ${contentHistory?.length || 0}
- Content types distribution: ${JSON.stringify(contentTypes || {})}
- Recent topics: ${recentTopics.join(", ")}

$${
      topPerformingContent && topPerformingContent.length > 0
        ? `TOP PERFORMING CONTENT:
${topPerformingContent
            .map(
              (post: any, idx: number) =>
                `${idx + 1}. Platform: ${post.platform}, Engagement: ${
                  (post.likes || 0) +
                  (post.shares || 0) * 2 +
                  (post.comments || 0) * 3
                } (${post.likes || 0} likes, ${post.shares || 0} shares, ${
                  post.comments || 0
                } comments)`,
            )
            .join("\n")}`
        : "No performance data available yet."
    }

Based on this data, generate 5 highly personalized content recommendations.

Return ONLY a JSON object with this EXACT structure:
{
  "recommendations": [
    {
      "title": "Compelling title for the content idea",
      "description": "2-3 sentence explanation of why this would perform well",
      "contentType": "blog|social|email|caption|article",
      "suggestedTone": "professional|casual|friendly|formal",
      "estimatedEngagement": "high|medium|low",
      "trendingScore": 85,
      "reasoningPoints": [
        "First reason why this is recommended",
        "Second data-driven insight",
        "Third strategic point"
      ],
      "keywords": ["keyword1", "keyword2", "keyword3"]
    }
  ],
  "trendingTopics": [
    {
      "topic": "Topic name",
      "relevance": "Why it's relevant to this user",
      "urgency": "high|medium|low"
    }
  ],
  "contentGaps": [
    "Content type or topic area the user hasn't explored but should"
  ]
}

CRITICAL REQUIREMENTS:
1. Recommendations must be specific to the user's industry and brand when such data exists; otherwise, make best-effort generic recommendations for small businesses.
2. Base suggestions on performance data patterns when available; if no data, clearly state you're extrapolating from general best practices.
3. Include fresh ideas, not just repetition of past topics.
4. Balance between proven content types and strategic diversification.
5. Consider seasonal trends and current events in the industry if enough context is provided.`;

    const userPrompt = `Generate personalized content recommendations for ${
      profile?.company_name || "this user"
    } in the ${profile?.industry || "general"} industry.

Focus on:
1. Content that aligns with their brand voice and target audience (or reasonable defaults if missing).
2. Topics that complement their recent content without repetition.
3. Formats that have historically performed well, when data exists.
4. Emerging trends in their industry.
5. Strategic content gaps to fill.

Provide actionable, specific recommendations that the user can implement immediately.`;

    // Claude API call with retry logic
    console.log("[generate-content-recommendations] Preparing Claude API call...");

    const claudeApiKey = Deno.env.get("CLAUDE_API_KEY");
    if (!claudeApiKey) {
      throw new Error("CLAUDE_API_KEY not configured");
    }

    const endpoint = "https://api.anthropic.com/v1/messages";

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
            temperature: 0.9,
            system: systemPrompt,
            messages: [
              {
                role: "user",
                content: userPrompt,
              },
            ],
          }),
        });

        console.log(`Claude API response status: ${response.status}`);

        // Handle rate limiting with exponential backoff
        if (response.status === 429) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw new Error("Rate limit exceeded. Please try again in a few moments.");
          }
          const waitTime = Math.pow(2, retryCount) * 1000;
          console.log(`Rate limited. Retrying in ${waitTime}ms (attempt ${retryCount}/${maxRetries})`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }

        // Handle other errors
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Claude API error response:", errorText);

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
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    const data = await response!.json();

    // Validate response structure
    if (!data.content?.[0]?.text) {
      console.error("Invalid response structure from Claude API:", JSON.stringify(data));

      if (data.stop_reason === "end_turn" && !data.content?.[0]?.text) {
        throw new Error("AI returned empty response. Please try again.");
      }

      throw new Error("Invalid or empty response from AI. Please try again.");
    }

    console.log("[generate-content-recommendations] Claude API response received");

    const generatedText = data.content[0].text;
    const tokenUsage = data.usage;

    console.log(
      `Token usage - Input: ${tokenUsage?.input_tokens || "N/A"}, Output: ${tokenUsage?.output_tokens || "N/A"}`
    );

    console.log(
      "Generated recommendations (first 300 chars):",
      generatedText.substring(0, 300),
    );

    // Clean and parse JSON from the model output
    let jsonText = generatedText.trim();

    // Strip markdown code fences if present
    if (jsonText.includes("```json")) {
      jsonText = jsonText.substring(jsonText.indexOf("```json") + 7);
      jsonText = jsonText.substring(0, jsonText.indexOf("``````".slice(0, 3)));
    } else if (jsonText.includes("```")) {
      jsonText = jsonText.substring(jsonText.indexOf("``````".slice(0, 3)) + 3);
      jsonText = jsonText.substring(0, jsonText.indexOf("``````".slice(0, 3)));
    }

    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Failed to parse JSON from response:", generatedText);
      throw new Error("Failed to parse JSON from response");
    }

    const recommendations = JSON.parse(jsonMatch[0]);
    console.log("Parsed recommendations summary:", {
      recommendationCount: recommendations.recommendations?.length || 0,
      trendingTopicCount: recommendations.trendingTopics?.length || 0,
      contentGapCount: recommendations.contentGaps?.length || 0,
    });

    return new Response(
      JSON.stringify({
        success: true,
        recommendations: recommendations.recommendations || [],
        trendingTopics: recommendations.trendingTopics || [],
        contentGaps: recommendations.contentGaps || [],
        userContext: {
          totalContent: contentHistory?.length || 0,
          topContentType:
            Object.keys(contentTypes || {}).sort(
              (a, b) => (contentTypes?.[b] || 0) - (contentTypes?.[a] || 0),
            )[0] || null,
          avgEngagement:
            publishedPosts && publishedPosts.length > 0
              ? Math.round(
                  publishedPosts.reduce(
                    (sum: number, post: any) =>
                      sum +
                      (post.likes || 0) +
                      (post.shares || 0) * 2 +
                      (post.comments || 0) * 3,
                    0,
                  ) / publishedPosts.length,
                )
              : 0,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Content recommendations error:", error);
    console.error("Error stack:", error?.stack);

    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
