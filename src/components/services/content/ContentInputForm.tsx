import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Sparkles } from 'lucide-react';

interface ContentInputFormProps {
  topic: string;
  tone: string;
  length: string;
  additionalContext: string;
  useResearch: boolean;
  contentType?: string;
  captionPlatform?: string;
  onTopicChange: (value: string) => void;
  onToneChange: (value: string) => void;
  onLengthChange: (value: string) => void;
  onContextChange: (value: string) => void;
  onResearchToggle: (value: boolean) => void;
  onCaptionPlatformChange?: (value: string) => void;
}

export function ContentInputForm({
  topic,
  tone,
  length,
  additionalContext,
  useResearch,
  contentType,
  captionPlatform,
  onTopicChange,
  onToneChange,
  onLengthChange,
  onContextChange,
  onResearchToggle,
  onCaptionPlatformChange
}: ContentInputFormProps) {
  const isCaption = contentType === 'caption';
  const isEmail = contentType === 'email';
  
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="topic" className="text-base font-semibold">Topic</Label>
        <Input
          id="topic"
          value={topic}
          onChange={(e) => onTopicChange(e.target.value)}
          placeholder="What do you want to write about?"
          className="mt-2"
        />
      </div>

      {/* Research Toggle */}
      <div className="flex items-center justify-between p-4 rounded-lg border border-primary/20 bg-primary/5">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <div>
            <Label htmlFor="research" className="text-base font-semibold cursor-pointer">
              Research-Enhanced Content
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              AI researches your topic first for data-driven, informed content
            </p>
          </div>
        </div>
        <Switch
          id="research"
          checked={useResearch}
          onCheckedChange={onResearchToggle}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="tone" className="text-base font-semibold">Tone</Label>
          <Select value={tone} onValueChange={onToneChange}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="friendly">Friendly</SelectItem>
              <SelectItem value="formal">Formal</SelectItem>
              <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
              <SelectItem value="informative">Informative</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isCaption ? (
          <div>
            <Label htmlFor="platform" className="text-base font-semibold">Platform</Label>
            <Select value={captionPlatform} onValueChange={onCaptionPlatformChange}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="instagram">Instagram (150 chars)</SelectItem>
                <SelectItem value="twitter">Twitter/X (280 chars)</SelectItem>
                <SelectItem value="facebook">Facebook (80 chars)</SelectItem>
                <SelectItem value="linkedin">LinkedIn (200 chars)</SelectItem>
                <SelectItem value="tiktok">TikTok (150 chars)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : isEmail ? (
          <div>
            <Label htmlFor="length" className="text-base font-semibold">Email Length</Label>
            <Select value={length} onValueChange={onLengthChange}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="brief">Brief (1-2 paragraphs)</SelectItem>
                <SelectItem value="standard">Standard (3-4 paragraphs)</SelectItem>
                <SelectItem value="detailed">Detailed (5-6 paragraphs)</SelectItem>
                <SelectItem value="comprehensive">Comprehensive (7+ paragraphs)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div>
            <Label htmlFor="length" className="text-base font-semibold">Length</Label>
            <Select value={length} onValueChange={onLengthChange}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="short">Short (300 words)</SelectItem>
                <SelectItem value="medium">Medium (600 words)</SelectItem>
                <SelectItem value="long">Long (1200 words)</SelectItem>
                <SelectItem value="very_long">Very Long (1500-2000 words)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="context" className="text-base font-semibold">Additional Context (Optional)</Label>
        <Textarea
          id="context"
          value={additionalContext}
          onChange={(e) => onContextChange(e.target.value)}
          placeholder="Add any specific details, keywords, or requirements..."
          rows={4}
          className="mt-2"
        />
      </div>
    </div>
  );
}
