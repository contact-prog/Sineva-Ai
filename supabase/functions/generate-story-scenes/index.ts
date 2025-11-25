import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateVertexAuthToken, getVertexProjectId } from "../_shared/vertex-auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateScenesRequest {
  storyInput: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { storyInput, aspectRatio }: GenerateScenesRequest = await req.json();

    console.log('[generate-story-scenes] Starting scene generation for user:', user.id);

    // Step 1: Detect duration from prompt using Gemini
    const detectedDuration = await detectVideoDuration(storyInput);
    console.log('[generate-story-scenes] Detected duration:', detectedDuration);

    // Step 2: Calculate number of scenes (avg 5-6s per scene)
    const sceneCount = Math.ceil(detectedDuration / 5.5);
    const sceneDuration = Math.floor(detectedDuration / sceneCount);

    // Step 3: Create video_generations record
    const { data: videoGen, error: insertError } = await supabase
      .from('video_generations')
      .insert({
        user_id: user.id,
        prompt: storyInput,
        user_prompt: storyInput,
        duration_seconds: detectedDuration,
        status: 'planning',
        generation_mode: 'story',
        metadata: { aspectRatio, sceneCount }
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Step 4: Generate scene plan with Gemini
    const scenes = await planScenesWithGemini(storyInput, detectedDuration, sceneCount, sceneDuration);

    // Step 5: Insert scenes into database
    const sceneInserts = scenes.map((scene, index) => ({
      video_generation_id: videoGen.id,
      scene_number: index + 1,
      visual_description: scene.visualDescription,
      duration_seconds: scene.duration,
      mood: scene.mood
    }));

    const { error: scenesError } = await supabase
      .from('video_story_scenes')
      .insert(sceneInserts);

    if (scenesError) throw scenesError;

    // Fetch the inserted scenes from database to return with correct schema
    const { data: insertedScenes, error: fetchError } = await supabase
      .from('video_story_scenes')
      .select('*')
      .eq('video_generation_id', videoGen.id)
      .order('scene_number');

    if (fetchError) throw fetchError;

    // Step 6: Update status
    await supabase
      .from('video_generations')
      .update({ status: 'scenes_planned' })
      .eq('id', videoGen.id);

    console.log('[generate-story-scenes] Successfully planned', insertedScenes?.length || 0, 'scenes');

    return new Response(
      JSON.stringify({ 
        videoGenerationId: videoGen.id,
        detectedDuration,
        sceneCount: insertedScenes?.length || 0,
        scenes: insertedScenes || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-story-scenes] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function detectVideoDuration(storyInput: string): Promise<number> {
  // Deterministic regex-based duration detection for speed and reliability
  // Handles patterns like "15-second", "15 sec", "15 seconds", "15s"
  const lower = storyInput.toLowerCase();

  // Pattern: number followed by optional space and a duration unit
  const match = lower.match(/(\d{1,3})\s*(second|seconds|sec|s)\b/);
  if (match) {
    const raw = parseInt(match[1], 10);
    if (!Number.isNaN(raw)) {
      // Clamp between 3 and 60 seconds
      return Math.max(3, Math.min(60, raw));
    }
  }

  // Also handle hyphenated patterns like "15-second"
  const hyphenMatch = lower.match(/(\d{1,3})-second/);
  if (hyphenMatch) {
    const raw = parseInt(hyphenMatch[1], 10);
    if (!Number.isNaN(raw)) {
      return Math.max(3, Math.min(60, raw));
    }
  }

  // Default when no explicit duration is present
  return 30;
}

async function planScenesWithGemini(
  storyInput: string, 
  duration: number, 
  sceneCount: number,
  sceneDuration: number
): Promise<Array<{ visualDescription: string; duration: number; mood: string }>> {
  const projectId = getVertexProjectId();
  const location = 'us-central1';
  const model = 'gemini-2.5-pro'; // More reliable model for scene planning
  
  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;
  
  const token = await generateVertexAuthToken();

  // Directive prompt for rich, story-specific scenes
  const prompt = `You are an expert video editor.
Plan exactly ${sceneCount} numbered visual scenes for this story: "${storyInput}".

- Total video length: ${duration} seconds
- Each scene is about ${sceneDuration} seconds
- Each visualDescription MUST be 1–3 full sentences describing what the camera sees.
- Descriptions must reference the story (location, characters, actions), not just moods or single adjectives.
- mood should be a short adjective (e.g. "dramatic", "hopeful").

Return ONLY a valid JSON array of objects with this shape (no extra text):
[
  {
    "sceneNumber": 1,
    "visualDescription": "Detailed description of what is on screen...",
    "duration": ${sceneDuration},
    "mood": "tone"
  }
]`;


  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 2048, // Increased to allow for thinking + output
        candidateCount: 1
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[generate-story-scenes] Gemini API error:', response.status, errorText);
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('[generate-story-scenes] Gemini response:', JSON.stringify(data, null, 2));
  
  const parts = data.candidates?.[0]?.content?.parts;
  const content = Array.isArray(parts)
    ? parts.map((p: any) => (typeof p.text === 'string' ? p.text : '')).join('\n').trim()
    : undefined;
  
  if (!content) {
    console.error('[generate-story-scenes] Empty or missing content. Falling back to simple scene split. Full response:', JSON.stringify(data, null, 2));
    // Fallback: deterministic simple scene split so the user still gets a plan
    return Array.from({ length: sceneCount }, (_, index) => ({
      visualDescription: `Scene ${index + 1} of ${sceneCount} for story: ${storyInput}`,
      duration: sceneDuration,
      mood: 'neutral'
    }));
  }
  
  try {
    // Extract JSON from markdown/code blocks if present
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\[[\s\S]*\]/);
    const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
    const parsed = JSON.parse(jsonText);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('Parsed scene array is empty');
    }

    const normalized = parsed.slice(0, sceneCount).map((raw: any, index: number) => {
      const mood = (raw.mood || `Scene ${index + 1}`).toString();
      const baseDesc = (raw.visualDescription || raw.description || '').toString().trim();
      const truncatedStory = storyInput.length > 140 ? storyInput.slice(0, 137) + '...' : storyInput;
      const visualDescription = baseDesc && baseDesc.length >= 20
        ? baseDesc
        : `Scene ${index + 1} (${mood.toLowerCase()}): key visual moment from the story about ${truncatedStory}`;

      const duration = Number(raw.duration) || sceneDuration;

      return {
        visualDescription,
        duration,
        mood,
      };
    });

    return normalized;
  } catch (err) {
    console.error('[generate-story-scenes] Failed to parse Gemini output as JSON. Falling back to simple scenes.', err, 'raw:', content);
    return Array.from({ length: sceneCount }, (_, index) => ({
      visualDescription: `Scene ${index + 1} of ${sceneCount} for story: ${storyInput}`,
      duration: sceneDuration,
      mood: 'neutral'
    }));
  }

}
