import { Scene } from './video-scene-planner.ts';

export interface AudioLayers {
  voiceoverUrl?: string;
  musicUrl?: string;
  voiceoverDuration?: number;
}

interface GenerateAudioLayersParams {
  scenes: Scene[];
  includeVoiceover: boolean;
  includeMusic: boolean;
  style: string;
  duration: number;
  vertexToken: string;
}

export async function generateAudioLayers(params: GenerateAudioLayersParams): Promise<AudioLayers> {
  const { scenes, includeVoiceover, includeMusic, style, duration, vertexToken } = params;

  const audioLayers: AudioLayers = {};

  // Generate voiceover if requested
  if (includeVoiceover) {
    console.log('Generating voiceover with Google Cloud TTS...');
    
    // Combine all scene narrations
    const fullScript = scenes
      .map(s => s.narration)
      .filter(n => n && n.trim().length > 0)
      .join(' ');

    if (fullScript.length > 0) {
      try {
        const voiceoverData = await generateVoiceover(fullScript, vertexToken, style);
        audioLayers.voiceoverUrl = voiceoverData.url;
        audioLayers.voiceoverDuration = duration;
        console.log('✓ Voiceover generated successfully');
      } catch (error: any) {
        console.error('Voiceover generation failed:', error);
        // Continue without voiceover - don't fail the entire video
      }
    } else {
      console.log('No narration text found, skipping voiceover');
    }
  }

  // Select background music if requested
  if (includeMusic) {
    console.log('Selecting background music...');
    audioLayers.musicUrl = selectBackgroundMusic(style, duration);
    console.log('✓ Music selected:', audioLayers.musicUrl);
  }

  return audioLayers;
}

async function generateVoiceover(text: string, vertexToken: string, style: string): Promise<{ url: string }> {
  // Google Cloud Text-to-Speech API v1
  const endpoint = 'https://texttospeech.googleapis.com/v1/text:synthesize';

  // Select voice based on content style
  const voiceConfigs: Record<string, { languageCode: string; name: string; ssmlGender: string }> = {
    narrative: {
      languageCode: 'en-US',
      name: 'en-US-Neural2-J', // Professional male voice
      ssmlGender: 'MALE'
    },
    viral: {
      languageCode: 'en-US',
      name: 'en-US-Neural2-F', // Energetic female voice
      ssmlGender: 'FEMALE'
    },
    music: {
      languageCode: 'en-US',
      name: 'en-US-Neural2-A', // Smooth neutral voice
      ssmlGender: 'MALE'
    },
    product: {
      languageCode: 'en-US',
      name: 'en-US-Neural2-D', // Clear professional voice
      ssmlGender: 'MALE'
    }
  };

  const voiceConfig = voiceConfigs[style] || voiceConfigs.narrative;

  console.log(`Using voice: ${voiceConfig.name} for style: ${style}`);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${vertexToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: { text },
      voice: voiceConfig,
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: style === 'viral' ? 1.1 : 1.0, // Slightly faster for viral content
        pitch: 0.0,
        volumeGainDb: 0.0
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('TTS API error:', error);
    throw new Error(`Voiceover generation failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  
  // The API returns base64-encoded audio in data.audioContent
  // In production, you would:
  // 1. Decode the base64 audio
  // 2. Upload to Supabase Storage
  // 3. Return the public URL
  
  // For now, return as data URL (placeholder)
  const audioDataUrl = `data:audio/mp3;base64,${data.audioContent}`;
  
  // TODO: Upload to storage
  // const audioBlob = base64ToBlob(data.audioContent, 'audio/mp3');
  // const audioUrl = await uploadToStorage(audioBlob, 'voiceovers', `voiceover-${Date.now()}.mp3`);
  
  return { url: audioDataUrl };
}

function selectBackgroundMusic(style: string, duration: number): string {
  // Music library mapping by style
  // In production, this would:
  // 1. Query a music database/API (e.g., Epidemic Sound, AudioJungle, or proprietary library)
  // 2. Filter by style, duration, and licensing
  // 3. Return URL to the selected track
  
  const musicLibrary: Record<string, { name: string; url: string }> = {
    narrative: {
      name: 'Cinematic Emotional Piano',
      url: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3' // Free Pixabay music
    },
    viral: {
      name: 'Upbeat Energetic Pop',
      url: 'https://cdn.pixabay.com/audio/2022/03/24/audio_c8c6dcdf0c.mp3'
    },
    music: {
      name: 'Artistic Creative Ambient',
      url: 'https://cdn.pixabay.com/audio/2022/01/18/audio_4a6d0f8e68.mp3'
    },
    product: {
      name: 'Corporate Professional',
      url: 'https://cdn.pixabay.com/audio/2022/08/23/audio_af3cba2c00.mp3'
    }
  };

  const selectedMusic = musicLibrary[style] || musicLibrary.narrative;
  
  console.log(`Selected music: "${selectedMusic.name}" for style: ${style}, duration: ${duration}s`);
  
  return selectedMusic.url;
}

// Helper function to convert base64 to Blob (for future use)
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

// Helper function to upload to Supabase Storage (for future use)
async function uploadToStorage(
  blob: Blob,
  bucket: string,
  filename: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<string> {
  // This would use Supabase Storage API to upload the audio file
  // and return the public URL
  
  const formData = new FormData();
  formData.append('file', blob, filename);
  
  const response = await fetch(
    `${supabaseUrl}/storage/v1/object/${bucket}/${filename}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: formData
    }
  );
  
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }
  
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${filename}`;
}
