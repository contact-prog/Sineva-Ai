import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Sparkles, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useChat } from '@/contexts/ChatContext';
import { toast } from 'sonner';

interface BlogSetupFormProps {
  // No props needed - uses context
}

const contentTemplates = [
  { id: 'none', name: 'No Template', description: 'Generate without a specific structure' },
  { id: 'how_to', name: 'How-To Guide', description: 'Step-by-step instructional content' },
  { id: 'listicle', name: 'Listicle', description: 'Numbered or bulleted list format' },
  { id: 'case_study', name: 'Case Study', description: 'Detailed analysis of a specific example' },
  { id: 'thought_leadership', name: 'Thought Leadership', description: 'Opinion piece or industry insights' },
  { id: 'comparison', name: 'Comparison', description: 'Side-by-side comparison of options' },
];

export default function BlogSetupForm({}: BlogSetupFormProps) {
  const { updateWorkflowStage, activeWorkflow, setActiveWorkflow } = useChat();
  
  // Pre-fill topic from workflow config if available
  const [topic, setTopic] = useState(activeWorkflow?.config?.topic || '');
  const [tone, setTone] = useState('professional');
  const [length, setLength] = useState('medium');
  const [template, setTemplate] = useState('none');
  const [additionalContext, setAdditionalContext] = useState('');
  const [useResearch, setUseResearch] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Update topic when workflow config changes
  useEffect(() => {
    if (activeWorkflow?.config?.topic) {
      setTopic(activeWorkflow.config.topic);
    }
  }, [activeWorkflow?.config?.topic]);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a topic');
      return;
    }

    setIsGenerating(true);
    updateWorkflowStage('generating');

    try {
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          contentType: 'blog',
          topic: topic.trim(),
          tone,
          length,
          templateFramework: template !== 'none' ? template : 'none',
          additionalContext: additionalContext.trim() || undefined,
          useResearch,
        },
      });

      if (error) throw error;

      // Update workflow with the generated content metadata
      if (activeWorkflow) {
        await setActiveWorkflow({
          ...activeWorkflow,
          stage: 'complete',
          metadata: {
            content: data.content,
            topic: data.topic || topic,
            contentType: 'blog',
            metaDescription: data.metaDescription,
            seoKeywords: data.seoKeywords,
            readabilityScore: data.readabilityScore
          }
        });
      } else {
        updateWorkflowStage('complete');
      }
      
      toast.success('Blog generated successfully!');
    } catch (error) {
      console.error('Blog generation error:', error);
      toast.error('Failed to generate blog');
      updateWorkflowStage('idle');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Create Your Blog Post
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Topic Input */}
        <div>
          <Label htmlFor="topic" className="text-base font-semibold">
            Topic *
          </Label>
          <Input
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
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
            onCheckedChange={setUseResearch}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Tone Selection */}
          <div>
            <Label htmlFor="tone" className="text-base font-semibold">
              Tone
            </Label>
            <Select value={tone} onValueChange={setTone}>
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

          {/* Length Selection */}
          <div>
            <Label htmlFor="length" className="text-base font-semibold">
              Word Count
            </Label>
            <Select value={length} onValueChange={setLength}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short">Short (300 words)</SelectItem>
                <SelectItem value="medium">Medium (600 words)</SelectItem>
                <SelectItem value="long">Long (1200 words)</SelectItem>
                <SelectItem value="very_long">Very Long (1500-2000 words)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Template Selection */}
        <div>
          <Label htmlFor="template" className="text-base font-semibold">
            Content Framework
          </Label>
          <Select value={template} onValueChange={setTemplate}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {contentTemplates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {template !== 'none' && (
            <p className="text-xs text-muted-foreground mt-2">
              {contentTemplates.find((t) => t.id === template)?.description}
            </p>
          )}
        </div>

        {/* Additional Context */}
        <div>
          <Label htmlFor="context" className="text-base font-semibold">
            Additional Context (Optional)
          </Label>
          <Textarea
            id="context"
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            placeholder="Add any specific details, keywords, or requirements..."
            rows={4}
            className="mt-2"
          />
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !topic.trim()}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Sparkles className="w-4 h-4 mr-2 animate-spin" />
              Generating Blog...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Blog Post
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
