import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Clock, Hash, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ContentOptimizerProps {
  content: string;
  platforms: string[];
  onApplyOptimization?: (optimization: any) => void;
}

export const ContentOptimizer = ({ content, platforms, onApplyOptimization }: ContentOptimizerProps) => {
  const [loading, setLoading] = useState(false);
  const [optimization, setOptimization] = useState<any>(null);
  const [optimizationType, setOptimizationType] = useState<'hashtags' | 'timing' | 'adaptation' | null>(null);

  const handleOptimize = async (type: 'hashtags' | 'timing' | 'adaptation') => {
    if (!content || platforms.length === 0) {
      toast.error('Please enter content and select platforms first');
      return;
    }

    setLoading(true);
    setOptimizationType(type);

    try {
      const { data, error } = await supabase.functions.invoke('optimize-social-content', {
        body: {
          content,
          platforms,
          optimizationType: type
        }
      });

      if (error) throw error;

      if (data.success) {
        setOptimization(data.optimization);
        toast.success('Content optimized successfully!');
      } else {
        throw new Error(data.error || 'Optimization failed');
      }
    } catch (error: any) {
      console.error('Optimization error:', error);
      toast.error(error.message || 'Failed to optimize content');
    } finally {
      setLoading(false);
    }
  };

  const renderOptimization = () => {
    if (!optimization || !optimizationType) return null;

    switch (optimizationType) {
      case 'hashtags':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Suggested Hashtags
              </CardTitle>
              <CardDescription>{optimization.reasoning}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {optimization.hashtags?.map((tag: string, idx: number) => (
                  <Badge key={idx} variant="secondary" className="cursor-pointer hover:bg-primary hover:text-primary-foreground">
                    #{tag}
                  </Badge>
                ))}
              </div>
              {onApplyOptimization && (
                <Button
                  onClick={() => onApplyOptimization(optimization)}
                  className="mt-4"
                  size="sm"
                >
                  Apply Hashtags
                </Button>
              )}
            </CardContent>
          </Card>
        );

      case 'timing':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Best Times to Post
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(optimization.recommendations || {}).map(([platform, data]: [string, any]) => (
                <div key={platform} className="border-l-2 border-primary pl-4">
                  <h4 className="font-semibold capitalize mb-2">{platform}</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Best Times: {data.bestTimes?.join(', ')} {data.timezone}</p>
                    <p>{data.reasoning}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );

      case 'adaptation':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Platform-Adapted Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(optimization.adaptations || {}).map(([platform, data]: [string, any]) => (
                <div key={platform} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold capitalize">{platform}</h4>
                    {onApplyOptimization && (
                      <Button
                        onClick={() => onApplyOptimization({ platform, content: data.content })}
                        variant="outline"
                        size="sm"
                      >
                        Use This
                      </Button>
                    )}
                  </div>
                  <div className="bg-muted p-3 rounded-lg text-sm">
                    {data.content}
                  </div>
                  <p className="text-xs text-muted-foreground">{data.changes}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => handleOptimize('hashtags')}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          <Hash className="h-4 w-4 mr-2" />
          {loading && optimizationType === 'hashtags' ? 'Generating...' : 'Suggest Hashtags'}
        </Button>
        <Button
          onClick={() => handleOptimize('timing')}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          <Clock className="h-4 w-4 mr-2" />
          {loading && optimizationType === 'timing' ? 'Analyzing...' : 'Best Time to Post'}
        </Button>
        <Button
          onClick={() => handleOptimize('adaptation')}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          {loading && optimizationType === 'adaptation' ? 'Adapting...' : 'Adapt for Platforms'}
        </Button>
      </div>

      {renderOptimization()}
    </div>
  );
};
