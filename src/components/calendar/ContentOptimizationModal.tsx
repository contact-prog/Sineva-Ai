import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sparkles, 
  Hash, 
  AlignLeft, 
  TrendingUp,
  Copy,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type IntegrationPlatform = Database['public']['Enums']['integration_platform'];

interface ContentOptimizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  platform: IntegrationPlatform;
  onApply: (optimizedContent: string, hashtags: string[]) => void;
}

interface OptimizationResult {
  optimizedCaption: string;
  hashtags: string[];
  suggestions: string[];
  characterCount: number;
  platformOptimal: boolean;
}

export function ContentOptimizationModal({
  open,
  onOpenChange,
  content,
  platform,
  onApply,
}: ContentOptimizationModalProps) {
  const { toast } = useToast();
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimization, setOptimization] = useState<OptimizationResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'caption' | 'hashtags' | 'all'>('all');

  const handleOptimize = async (type: 'caption' | 'hashtags' | 'all' = 'all') => {
    setIsOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('optimize-post-content', {
        body: {
          content,
          platform,
          optimizationType: type,
        },
      });

      if (error) throw error;

      setOptimization(data);
      toast({
        title: 'Content Optimized',
        description: `Your ${platform} post has been optimized by AI`,
      });
    } catch (error: any) {
      console.error('Optimization error:', error);
      toast({
        title: 'Optimization Failed',
        description: error.message || 'Failed to optimize content',
        variant: 'destructive',
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Copied',
      description: 'Content copied to clipboard',
    });
  };

  const handleApply = () => {
    if (optimization) {
      onApply(optimization.optimizedCaption, optimization.hashtags);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Content Optimization
          </DialogTitle>
          <DialogDescription>
            Optimize your post for {platform} with AI-powered suggestions
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Full Optimize
            </TabsTrigger>
            <TabsTrigger value="caption" className="gap-2">
              <AlignLeft className="h-4 w-4" />
              Caption Only
            </TabsTrigger>
            <TabsTrigger value="hashtags" className="gap-2">
              <Hash className="h-4 w-4" />
              Hashtags Only
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <OptimizationContent
              content={content}
              optimization={optimization}
              isOptimizing={isOptimizing}
              onOptimize={() => handleOptimize('all')}
              onCopy={handleCopy}
              copied={copied}
            />
          </TabsContent>

          <TabsContent value="caption" className="space-y-4">
            <OptimizationContent
              content={content}
              optimization={optimization}
              isOptimizing={isOptimizing}
              onOptimize={() => handleOptimize('caption')}
              onCopy={handleCopy}
              copied={copied}
              showHashtags={false}
            />
          </TabsContent>

          <TabsContent value="hashtags" className="space-y-4">
            <HashtagsContent
              optimization={optimization}
              isOptimizing={isOptimizing}
              onOptimize={() => handleOptimize('hashtags')}
              onCopy={handleCopy}
              copied={copied}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {optimization && (
            <Button onClick={handleApply} className="gap-2">
              <Check className="h-4 w-4" />
              Apply Optimization
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OptimizationContent({
  content,
  optimization,
  isOptimizing,
  onOptimize,
  onCopy,
  copied,
  showHashtags = true,
}: {
  content: string;
  optimization: OptimizationResult | null;
  isOptimizing: boolean;
  onOptimize: () => void;
  onCopy: (text: string) => void;
  copied: boolean;
  showHashtags?: boolean;
}) {
  return (
    <>
      {/* Original Content */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Original Content</label>
        <Textarea
          value={content}
          readOnly
          className="min-h-[100px] bg-muted"
        />
        <p className="text-xs text-muted-foreground">
          {content.length} characters
        </p>
      </div>

      {/* Optimize Button */}
      {!optimization && (
        <Button
          onClick={onOptimize}
          disabled={isOptimizing}
          className="w-full gap-2"
        >
          {isOptimizing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Optimizing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Optimize with AI
            </>
          )}
        </Button>
      )}

      {/* Optimized Results */}
      {optimization && (
        <div className="space-y-4 border-t pt-4">
          {/* Optimized Caption */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Optimized Caption</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCopy(optimization.optimizedCaption)}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <Textarea
              value={optimization.optimizedCaption}
              readOnly
              className="min-h-[100px]"
            />
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {optimization.characterCount} characters
              </p>
              <Badge
                variant={optimization.platformOptimal ? 'default' : 'secondary'}
                className="gap-1"
              >
                <TrendingUp className="h-3 w-3" />
                {optimization.platformOptimal ? 'Optimal' : 'Suboptimal'}
              </Badge>
            </div>
          </div>

          {/* Hashtags */}
          {showHashtags && optimization.hashtags.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Suggested Hashtags</label>
              <div className="flex flex-wrap gap-2">
                {optimization.hashtags.map((tag, index) => (
                  <Badge key={index} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {optimization.suggestions.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                Suggestions
              </label>
              <ul className="space-y-1">
                {optimization.suggestions.map((suggestion, index) => (
                  <li key={index} className="text-sm text-muted-foreground">
                    • {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button onClick={onOptimize} variant="outline" className="w-full gap-2">
            <Sparkles className="h-4 w-4" />
            Re-optimize
          </Button>
        </div>
      )}
    </>
  );
}

function HashtagsContent({
  optimization,
  isOptimizing,
  onOptimize,
  onCopy,
  copied,
}: {
  optimization: OptimizationResult | null;
  isOptimizing: boolean;
  onOptimize: () => void;
  onCopy: (text: string) => void;
  copied: boolean;
}) {
  return (
    <>
      {!optimization && (
        <Button
          onClick={onOptimize}
          disabled={isOptimizing}
          className="w-full gap-2"
        >
          {isOptimizing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating Hashtags...
            </>
          ) : (
            <>
              <Hash className="h-4 w-4" />
              Generate Hashtags
            </>
          )}
        </Button>
      )}

      {optimization && optimization.hashtags.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">AI-Generated Hashtags</label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCopy(optimization.hashtags.join(' '))}
              className="gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy All
                </>
              )}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {optimization.hashtags.map((tag, index) => (
              <Badge
                key={index}
                variant="outline"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                onClick={() => onCopy(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
          <Button onClick={onOptimize} variant="outline" className="w-full gap-2">
            <Sparkles className="h-4 w-4" />
            Generate New Hashtags
          </Button>
        </div>
      )}
    </>
  );
}
