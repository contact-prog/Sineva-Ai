import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp,
  FileText,
  Hash,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SEOAnalysis {
  overallScore: number;
  metaTitle: string;
  metaDescription: string;
  h1Heading: string;
  h2Headings: string[];
  readabilityScore: number;
  wordCount: number;
  keywordDensity: { keyword: string; density: number }[];
  recommendations: string[];
  strengths: string[];
  warnings: string[];
}

interface SEOScoreCardProps {
  seoAnalysis: SEOAnalysis | null;
  isAnalyzing: boolean;
}

export function SEOScoreCard({ seoAnalysis, isAnalyzing }: SEOScoreCardProps) {
  if (isAnalyzing) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-primary animate-pulse" />
          <span className="font-semibold">Analyzing SEO...</span>
        </div>
      </Card>
    );
  }

  if (!seoAnalysis) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Needs Improvement';
    return 'Poor';
  };

  return (
    <Card className="p-6 border-primary/20">
      <div className="space-y-6">
        {/* Overall Score */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">SEO Score</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("text-3xl font-bold", getScoreColor(seoAnalysis.overallScore))}>
                {seoAnalysis.overallScore}
              </span>
              <span className="text-muted-foreground">/100</span>
            </div>
          </div>
          <Progress value={seoAnalysis.overallScore} className="h-3" />
          <p className="text-sm text-muted-foreground mt-2">
            {getScoreLabel(seoAnalysis.overallScore)}
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <FileText className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Word Count</p>
              <p className="font-semibold">{seoAnalysis.wordCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <BarChart3 className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Readability</p>
              <p className="font-semibold">{seoAnalysis.readabilityScore}/100</p>
            </div>
          </div>
        </div>

        {/* Meta Information */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Recommended Meta Tags</h4>
          <div className="space-y-2">
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Meta Title</p>
              <p className="text-sm">{seoAnalysis.metaTitle}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Meta Description</p>
              <p className="text-sm">{seoAnalysis.metaDescription}</p>
            </div>
          </div>
        </div>

        {/* Keyword Density */}
        {seoAnalysis.keywordDensity.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Hash className="w-4 h-4 text-primary" />
              <h4 className="font-semibold text-sm">Keyword Density</h4>
            </div>
            <div className="space-y-2">
              {seoAnalysis.keywordDensity.map((kw, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm">{kw.keyword}</span>
                  <Badge variant="secondary">{kw.density.toFixed(1)}%</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strengths */}
        {seoAnalysis.strengths.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <h4 className="font-semibold text-sm">Strengths</h4>
            </div>
            <ul className="space-y-1">
              {seoAnalysis.strengths.map((strength, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Warnings */}
        {seoAnalysis.warnings.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1 mt-2">
                {seoAnalysis.warnings.map((warning, index) => (
                  <p key={index} className="text-sm">{warning}</p>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Recommendations */}
        {seoAnalysis.recommendations.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h4 className="font-semibold text-sm">Recommendations</h4>
            </div>
            <ul className="space-y-2">
              {seoAnalysis.recommendations.map((rec, index) => (
                <li key={index} className="text-sm text-muted-foreground pl-6 relative">
                  <span className="absolute left-0 top-1 text-primary">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
