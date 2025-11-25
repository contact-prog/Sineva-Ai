import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Brain, Target, TrendingUp, Lightbulb, MessageSquare, Award, CheckCircle2 } from 'lucide-react';
import { ScrapedData } from '@/types/onboarding';
import { Progress } from '@/components/ui/progress';

interface BrandIntelligenceDisplayProps {
  brandIntelligence: NonNullable<ScrapedData['brandIntelligence']>;
}

export function BrandIntelligenceDisplay({ brandIntelligence }: BrandIntelligenceDisplayProps) {
  return (
    <Card className="p-6 bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">AI Brand Intelligence</h3>
          <p className="text-sm text-muted-foreground">
            Comprehensive analysis powered by AI
          </p>
        </div>
      </div>

      <Accordion type="multiple" defaultValue={['voice', 'audience', 'taglines']} className="space-y-3">
        {/* Brand Voice */}
        <AccordionItem value="voice" className="border rounded-lg px-4 bg-background/50">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3 flex-1">
              <MessageSquare className="w-4 h-4 text-purple-500" />
              <span className="font-medium">Brand Voice</span>
              <Badge variant="secondary" className="ml-auto mr-2">
                {Math.round(brandIntelligence.brandVoice.confidence * 100)}% confident
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-3 space-y-3">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Primary Tone</p>
              <Badge variant="default" className="text-sm">
                {brandIntelligence.brandVoice.tone}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Characteristics</p>
              <div className="flex flex-wrap gap-2">
                {brandIntelligence.brandVoice.characteristics.map((char, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {char}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="mt-2">
              <Progress value={brandIntelligence.brandVoice.confidence * 100} className="h-2" />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Target Audience */}
        <AccordionItem value="audience" className="border rounded-lg px-4 bg-background/50">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3 flex-1">
              <Target className="w-4 h-4 text-blue-500" />
              <span className="font-medium">Target Audience</span>
              <Badge variant="secondary" className="ml-auto mr-2">
                {Math.round(brandIntelligence.targetAudience.confidence * 100)}% confident
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-3 space-y-3">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Demographics</p>
              <p className="text-sm">{brandIntelligence.targetAudience.demographics}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Psychographics</p>
              <p className="text-sm">{brandIntelligence.targetAudience.psychographics}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Pain Points</p>
              <div className="space-y-1">
                {brandIntelligence.targetAudience.painPoints.map((point, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Industry Analysis */}
        <AccordionItem value="industry" className="border rounded-lg px-4 bg-background/50">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="font-medium">Industry Analysis</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Category</p>
                <Badge variant="secondary">{brandIntelligence.industryAnalysis.category}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Market Position</p>
                <Badge variant="secondary">{brandIntelligence.industryAnalysis.marketPosition}</Badge>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Key Competitors</p>
              <div className="flex flex-wrap gap-2">
                {brandIntelligence.industryAnalysis.competitors.map((comp, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {comp}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Industry Trends</p>
              <div className="space-y-1">
                {brandIntelligence.industryAnalysis.trends.map((trend, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <TrendingUp className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{trend}</span>
                  </div>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Tagline Suggestions */}
        <AccordionItem value="taglines" className="border rounded-lg px-4 bg-background/50">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              <span className="font-medium">Tagline Suggestions</span>
              <Badge variant="outline" className="ml-2">
                {brandIntelligence.taglineSuggestions.length} ideas
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-3">
            <div className="space-y-3">
              {brandIntelligence.taglineSuggestions.map((suggestion, i) => (
                <div key={i} className="p-3 rounded-lg bg-yellow-50/50 dark:bg-yellow-950/20 border border-yellow-200/50 dark:border-yellow-800/50">
                  <p className="font-medium text-sm mb-1">"{suggestion.text}"</p>
                  <p className="text-xs text-muted-foreground">{suggestion.rationale}</p>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Content Strategy */}
        <AccordionItem value="content" className="border rounded-lg px-4 bg-background/50">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-4 h-4 text-indigo-500" />
              <span className="font-medium">Content Strategy</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-3 space-y-3">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Recommended Content Types</p>
              <div className="flex flex-wrap gap-2">
                {brandIntelligence.contentStrategy.contentTypes.map((type, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {type}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Posting Frequency</p>
              <Badge variant="outline">{brandIntelligence.contentStrategy.postingFrequency}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Key Themes</p>
              <div className="flex flex-wrap gap-2">
                {brandIntelligence.contentStrategy.keyThemes.map((theme, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {theme}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Best Platforms</p>
              <div className="flex flex-wrap gap-2">
                {brandIntelligence.contentStrategy.platforms.map((platform, i) => (
                  <Badge key={i} variant="default" className="text-xs">
                    {platform}
                  </Badge>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Brand Strengths */}
        <AccordionItem value="strengths" className="border rounded-lg px-4 bg-background/50">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <Award className="w-4 h-4 text-amber-500" />
              <span className="font-medium">Brand Strengths</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-3">
            <div className="space-y-2">
              {brandIntelligence.brandStrengths.map((strength, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded bg-amber-50/30 dark:bg-amber-950/10">
                  <Award className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{strength}</span>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Marketing Recommendations */}
        <AccordionItem value="marketing" className="border rounded-lg px-4 bg-background/50">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span className="font-medium">Marketing Recommendations</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-3">
            <div className="space-y-3">
              {brandIntelligence.marketingRecommendations.map((rec, i) => (
                <div key={i} className="p-3 rounded-lg border bg-background/50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm">{rec.strategy}</p>
                    <Badge 
                      variant={rec.priority === 'high' ? 'default' : rec.priority === 'medium' ? 'secondary' : 'outline'}
                      className="text-xs"
                    >
                      {rec.priority} priority
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{rec.description}</p>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}