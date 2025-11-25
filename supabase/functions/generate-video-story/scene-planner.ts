const VERTEX_REGION = 'us-central1';

export interface Scene {
  sceneNumber: number;
  duration: number;
  visualDescription: string;
  narration: string;
  mood: string;
  cameraMovement?: string;
}

interface PlanScenesParams {
  storyInput: string;
  duration: number;
  style: string;
  numScenes: number;
  vertexToken: string;
  projectId: string;
}

export async function planScenes(params: PlanScenesParams): Promise<Scene[]> {
  const { storyInput, duration, style, numScenes, vertexToken, projectId } = params;

  const systemPrompt = `You are an expert video storyboard creator and scene planner. Your job is to break down a story into ${numScenes} compelling visual scenes for a ${duration}-second video in ${style} style.

For each scene, provide:
1. Visual description (what should be shown)
2. Narration text (what should be said/displayed)
3. Mood/emotion (the feeling to convey)
4. Camera movement suggestion (optional)

Make sure scenes flow naturally and the total duration equals ${duration} seconds.`;

  const userPrompt = `Break down this story into exactly ${numScenes} scenes:

${storyInput}

Total video duration: ${duration} seconds
Style: ${style}

Return a JSON array of scenes with this structure:
[
  {
    "sceneNumber": 1,
    "duration": 8,
    "visualDescription": "detailed visual description",
    "narration": "what to say or display",
    "mood": "emotion/feeling",
    "cameraMovement": "camera direction"
  }
]`;

  const endpoint = `https://${VERTEX_REGION}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${VERTEX_REGION}/publishers/google/models/gemini-2.5-pro:generateContent`;

  console.log('Calling Gemini 2.5 Pro for scene planning...');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${vertexToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: systemPrompt + '\n\n' + userPrompt }]
        }
      ],
      generationConfig: {
        temperature: 0.9,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Scene planning API error:', error);
    throw new Error(`Scene planning failed: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No scene plan generated');
  }

  // Extract JSON from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error('Raw response:', text);
    throw new Error('Failed to extract scene plan JSON');
  }

  const scenes: Scene[] = JSON.parse(jsonMatch[0]);

  // Validate and adjust durations to match total
  const totalSceneDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
  if (Math.abs(totalSceneDuration - duration) > 2) {
    // Adjust proportionally
    const ratio = duration / totalSceneDuration;
    scenes.forEach(s => {
      s.duration = Math.round(s.duration * ratio);
    });
  }

  return scenes;
}
