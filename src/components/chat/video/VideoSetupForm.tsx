import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useChat } from '@/contexts/ChatContext';
import { Sparkles, Loader2 } from 'lucide-react';

export default function VideoSetupForm() {
  const { activeWorkflow, updateWorkflowConfig, sendMessage } = useChat();
  const [duration, setDuration] = useState('6');
  const [quality, setQuality] = useState('fast');
  const [includeVoiceover, setIncludeVoiceover] = useState(true);
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);

    // Build the generation command
    const command = `Generate video with: duration=${duration}s, quality=${quality}, voiceover=${includeVoiceover}${additionalInstructions ? `, instructions: ${additionalInstructions}` : ''}`;
    
    await sendMessage(command);
  };

  return (
    <Card className="p-6 space-y-4 bg-card border-border/30">
      <div>
        <h3 className="font-semibold text-lg mb-1">Video Settings</h3>
        <p className="text-sm text-muted-foreground">
          Customize your video generation
        </p>
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <Label>Duration</Label>
        <Select value={duration} onValueChange={setDuration}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="4">4 seconds - Quick</SelectItem>
            <SelectItem value="6">6 seconds - Standard</SelectItem>
            <SelectItem value="8">8 seconds - Extended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quality */}
      <div className="space-y-2">
        <Label>Model Quality</Label>
        <Select value={quality} onValueChange={setQuality}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fast">Veo 3.1 Fast - Faster generation</SelectItem>
            <SelectItem value="standard">Veo 3.1 (Best Quality) - Highest quality</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Voiceover Toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
        <div className="space-y-0.5">
          <Label>Include Voiceover</Label>
          <p className="text-xs text-muted-foreground">
            AI-generated narration
          </p>
        </div>
        <Switch
          checked={includeVoiceover}
          onCheckedChange={setIncludeVoiceover}
        />
      </div>

      {/* Additional Instructions */}
      <div className="space-y-2">
        <Label>Additional Instructions (Optional)</Label>
        <Textarea
          placeholder="E.g., 'Focus on product features', 'Make it cinematic', 'Include customer testimonials'"
          value={additionalInstructions}
          onChange={(e) => setAdditionalInstructions(e.target.value)}
          rows={3}
          className="resize-none"
        />
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Creating Video...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Video
          </>
        )}
      </Button>
    </Card>
  );
}
