import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Tag, BarChart3 } from 'lucide-react';

interface BlogSEOMetadataProps {
  metaDescription?: string;
  seoKeywords?: string[];
  readabilityScore?: number;
}

export function BlogSEOMetadata({ metaDescription, seoKeywords, readabilityScore }: BlogSEOMetadataProps) {
  if (!metaDescription && !seoKeywords && !readabilityScore) {
    return null;
  }

  const getReadabilityLevel = (score: number): { level: string; color: string } => {
    if (score >= 90) return { level: 'Very Easy', color: 'bg-green-500' };
    if (score >= 80) return { level: 'Easy', color: 'bg-green-400' };
    if (score >= 70) return { level: 'Fairly Easy', color: 'bg-blue-500' };
    if (score >= 60) return { level: 'Standard', color: 'bg-blue-400' };
    if (score >= 50) return { level: 'Fairly Difficult', color: 'bg-yellow-500' };
    if (score >= 30) return { level: 'Difficult', color: 'bg-orange-500' };
    return { level: 'Very Difficult', color: 'bg-red-500' };
  };

  return (
    <Card className="p-6 space-y-4 bg-muted/30">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">SEO & Readability</h3>
      </div>

      {metaDescription && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Meta Description</span>
            <Badge variant="outline" className="text-xs">
              {metaDescription.length} chars
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground pl-6">{metaDescription}</p>
        </div>
      )}

      {seoKeywords && seoKeywords.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">SEO Keywords</span>
          </div>
          <div className="flex flex-wrap gap-2 pl-6">
            {seoKeywords.map((keyword, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {keyword}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {readabilityScore !== undefined && readabilityScore !== null && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Readability Score (Flesch-Kincaid)</span>
          </div>
          <div className="pl-6 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getReadabilityLevel(readabilityScore).color}`} />
              <span className="text-sm font-semibold">{readabilityScore}/100</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {getReadabilityLevel(readabilityScore).level}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground pl-6">
            Higher scores indicate easier readability. 60-70 is ideal for general audiences.
          </p>
        </div>
      )}
    </Card>
  );
}
