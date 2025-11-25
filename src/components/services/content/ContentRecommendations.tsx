import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, TrendingUp, AlertCircle, Lightbulb, ArrowRight, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Recommendation {
  title: string;
  description: string;
  contentType: string;
  suggestedTone: string;
  estimatedEngagement: 'high' | 'medium' | 'low';
  trendingScore: number;
  reasoningPoints: string[];
  keywords: string[];
}

interface TrendingTopic {
  topic: string;
  relevance: string;
  urgency: 'high' | 'medium' | 'low';
}

interface ContentRecommendationsProps {
  onSelectRecommendation?: (title: string, contentType: string, tone: string) => void;
}

export const ContentRecommendations = ({ onSelectRecommendation }: ContentRecommendationsProps) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [contentGaps, setContentGaps] = useState<string[]>([]);
  const [userContext, setUserContext] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if recommendations are cached in sessionStorage
    const cachedData = sessionStorage.getItem('ai-content-recommendations');
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        setRecommendations(parsed.recommendations || []);
        setTrendingTopics(parsed.trendingTopics || []);
        setContentGaps(parsed.contentGaps || []);
        setUserContext(parsed.userContext || null);
        setLoading(false);
        return;
      } catch (e) {
        console.error('Failed to parse cached recommendations:', e);
      }
    }
    
    // If no cache, fetch fresh recommendations
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-content-recommendations');

      if (error) throw error;

      if (data.success) {
        setRecommendations(data.recommendations || []);
        setTrendingTopics(data.trendingTopics || []);
        setContentGaps(data.contentGaps || []);
        setUserContext(data.userContext);
        
        // Cache recommendations in sessionStorage
        sessionStorage.setItem('ai-content-recommendations', JSON.stringify({
          recommendations: data.recommendations || [],
          trendingTopics: data.trendingTopics || [],
          contentGaps: data.contentGaps || [],
          userContext: data.userContext || null,
        }));
        
        toast.success('AI recommendations generated!');
      } else {
        throw new Error(data.error || 'Failed to generate recommendations');
      }
    } catch (error: any) {
      console.error('Error fetching recommendations:', error);
      toast.error('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const getEngagementColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'low': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default: return 'bg-secondary';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              AI Content Recommendations
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Personalizing suggestions based on your content...
            </p>
          </div>
        </div>
        
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="relative">
              <Sparkles className="h-16 w-16 text-primary animate-pulse" />
              <div className="absolute inset-0 h-16 w-16">
                <Sparkles className="h-16 w-16 text-primary/30 animate-ping" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h4 className="text-lg font-semibold">Analyzing Your Content Strategy</h4>
              <p className="text-sm text-muted-foreground max-w-md">
                Our AI is reviewing your content history, performance metrics, and industry trends to generate personalized recommendations...
              </p>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-2 w-20 rounded-full" />
              <Skeleton className="h-2 w-20 rounded-full" />
              <Skeleton className="h-2 w-20 rounded-full" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI Content Recommendations
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Personalized suggestions based on your content performance and industry trends
          </p>
        </div>
        <Button onClick={fetchRecommendations} disabled={loading} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {userContext && (userContext.totalContent > 0 || userContext.avgEngagement > 0) && (
        <div className="grid grid-cols-3 gap-4">
          {userContext.totalContent > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userContext.totalContent}</div>
                <p className="text-xs text-muted-foreground mt-1">Pieces generated</p>
              </CardContent>
            </Card>
          )}
          {userContext.topContentType && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Top Format</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">{userContext.topContentType}</div>
                <p className="text-xs text-muted-foreground mt-1">Most used type</p>
              </CardContent>
            </Card>
          )}
          {userContext.avgEngagement > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userContext.avgEngagement}</div>
                <p className="text-xs text-muted-foreground mt-1">Engagement score</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Tabs defaultValue="recommendations" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recommendations">
            <Lightbulb className="h-4 w-4 mr-2" />
            Recommendations ({recommendations.length})
          </TabsTrigger>
          <TabsTrigger value="trending">
            <TrendingUp className="h-4 w-4 mr-2" />
            Trending Topics ({trendingTopics.length})
          </TabsTrigger>
          <TabsTrigger value="gaps">
            <AlertCircle className="h-4 w-4 mr-2" />
            Content Gaps ({contentGaps.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations">
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {recommendations.length === 0 ? (
                <Card className="p-12 text-center">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">
                    Generate some content first to receive personalized recommendations
                  </p>
                </Card>
              ) : (
                recommendations.map((rec, idx) => (
                  <Card key={idx} className="hover:border-primary/50 transition-colors">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="capitalize">
                              {rec.contentType}
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {rec.suggestedTone}
                            </Badge>
                            <Badge variant="outline" className={getEngagementColor(rec.estimatedEngagement)}>
                              {rec.estimatedEngagement} engagement
                            </Badge>
                          </div>
                          <CardTitle className="text-xl">{rec.title}</CardTitle>
                          <CardDescription className="mt-2">{rec.description}</CardDescription>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-primary">{rec.trendingScore}</div>
                            <div className="text-xs text-muted-foreground">Score</div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Why This Works:</h4>
                        <ul className="space-y-1">
                          {rec.reasoningPoints.map((point, pidx) => (
                            <li key={pidx} className="text-sm text-muted-foreground flex items-start gap-2">
                              <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold mb-2">Suggested Keywords:</h4>
                        <div className="flex flex-wrap gap-2">
                          {rec.keywords.map((keyword, kidx) => (
                            <Badge key={kidx} variant="secondary" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <Button
                        onClick={() => onSelectRecommendation?.(rec.title, rec.contentType, rec.suggestedTone)}
                        className="w-full"
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Create This Content
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="trending">
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-3">
              {trendingTopics.length === 0 ? (
                <Card className="p-12 text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No trending topics available</p>
                </Card>
              ) : (
                trendingTopics.map((topic, idx) => (
                  <Card key={idx} className="hover:border-primary/50 transition-colors">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{topic.topic}</CardTitle>
                        <Badge variant={getUrgencyColor(topic.urgency)}>
                          {topic.urgency} urgency
                        </Badge>
                      </div>
                      <CardDescription className="mt-2">{topic.relevance}</CardDescription>
                    </CardHeader>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="gaps">
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-3">
              {contentGaps.length === 0 ? (
                <Card className="p-12 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Your content strategy looks well-rounded!</p>
                </Card>
              ) : (
                contentGaps.map((gap, idx) => (
                  <Card key={idx} className="hover:border-primary/50 transition-colors">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium mb-1">Opportunity Identified</p>
                          <p className="text-sm text-muted-foreground">{gap}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
