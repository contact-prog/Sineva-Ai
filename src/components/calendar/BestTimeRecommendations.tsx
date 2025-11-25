import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Clock,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Calendar as CalendarIcon,
  Loader2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type IntegrationPlatform = Database['public']['Enums']['integration_platform'];

const PLATFORM_ICONS: Record<string, any> = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
};

const PLATFORM_COLORS: Record<string, string> = {
  facebook: 'text-blue-600 bg-blue-500/10',
  instagram: 'text-pink-600 bg-pink-500/10',
  twitter: 'text-sky-600 bg-sky-500/10',
  linkedin: 'text-blue-700 bg-blue-600/10',
};

interface TimeRecommendation {
  time: string;
  hour: number;
  reason: string;
}

interface PlatformRecommendation {
  bestTimes: TimeRecommendation[];
  bestDays?: string[];
  confidence: 'low' | 'medium' | 'high';
  dataPoints: number;
  insights: string;
}

export function BestTimeRecommendations() {
  const [selectedPlatform, setSelectedPlatform] = useState<IntegrationPlatform>('facebook');
  const navigate = useNavigate();

  const { data: recommendations, isLoading } = useQuery({
    queryKey: ['best-times'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('suggest-best-times', {
        body: {
          platforms: ['facebook', 'instagram', 'twitter', 'linkedin'],
        },
      });

      if (error) throw error;
      return data.recommendations as Record<IntegrationPlatform, PlatformRecommendation>;
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });

  const currentRecommendation = recommendations?.[selectedPlatform];

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Best Time Recommendations
            </CardTitle>
            <CardDescription>
              Optimal posting times based on your audience engagement
            </CardDescription>
          </div>
          <Badge variant="outline" className="gap-1">
            <TrendingUp className="h-3 w-3" />
            Powered by AI
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={selectedPlatform} onValueChange={(v) => setSelectedPlatform(v as IntegrationPlatform)}>
            <TabsList className="grid w-full grid-cols-4">
              {(['facebook', 'instagram', 'twitter', 'linkedin'] as IntegrationPlatform[]).map((platform) => {
                const Icon = PLATFORM_ICONS[platform];
                return (
                  <TabsTrigger key={platform} value={platform} className="gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline capitalize">{platform}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {(['facebook', 'instagram', 'twitter', 'linkedin'] as IntegrationPlatform[]).map((platform) => (
              <TabsContent key={platform} value={platform} className="space-y-4 mt-4">
                {recommendations?.[platform] && (
                  <>
                    {/* Confidence Badge */}
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={cn(
                          'capitalize',
                          recommendations[platform].confidence === 'high' && 'border-green-500 text-green-700',
                          recommendations[platform].confidence === 'medium' && 'border-yellow-500 text-yellow-700',
                          recommendations[platform].confidence === 'low' && 'border-gray-500 text-gray-700'
                        )}
                      >
                        {recommendations[platform].confidence} confidence
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Based on {recommendations[platform].dataPoints} posts
                      </span>
                    </div>

                    {/* Best Times */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        Best Times to Post
                      </h4>
                      <div className="grid gap-2">
                        {recommendations[platform].bestTimes.map((time, index) => (
                          <div
                            key={index}
                            className={cn(
                              'flex items-center justify-between p-3 rounded-lg border',
                              index === 0 && 'border-primary bg-primary/5'
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn('p-2 rounded-lg', PLATFORM_COLORS[platform])}>
                                <Clock className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-semibold">{time.time}</p>
                                <p className="text-xs text-muted-foreground">{time.reason}</p>
                              </div>
                            </div>
                            {index === 0 && (
                              <Badge className="bg-primary text-primary-foreground">Best</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Best Days */}
                    {recommendations[platform].bestDays && recommendations[platform].bestDays!.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-primary" />
                          Best Days to Post
                        </h4>
                        <div className="flex gap-2 flex-wrap">
                          {recommendations[platform].bestDays!.map((day) => (
                            <Badge key={day} variant="secondary" className="px-3 py-1">
                              {day}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Insights */}
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <p className="text-sm text-muted-foreground">{recommendations[platform].insights}</p>
                    </div>

                    {/* Apply Button */}
                    <Button className="w-full gap-2" onClick={() => {
                      // Navigate to create post page to use these best times
                      navigate('/app/calendar/create');
                    }}>
                      Schedule at Best Time
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
