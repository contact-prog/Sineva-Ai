import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Download, ExternalLink, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface BlogPreviewCardProps {
  content: string;
  topic: string;
  contentType: string;
  metaDescription?: string;
  seoKeywords?: string[];
  readabilityScore?: number;
}

export default function BlogPreviewCard({
  content,
  topic,
  contentType,
  metaDescription,
  seoKeywords,
  readabilityScore,
}: BlogPreviewCardProps) {
  const navigate = useNavigate();

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast.success('Content copied to clipboard');
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${topic.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Content downloaded');
  };

  const handleOpenInContent = () => {
    // Navigate to Content page with the generated blog pre-loaded
    navigate('/app/content', {
      state: {
        preloadedContent: content,
        contentType,
        topic,
        metaDescription,
        seoKeywords,
        readabilityScore,
      }
    });
  };

  return (
    <Card className="p-6 space-y-4 bg-card border-border">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">Blog Generated</h3>
          </div>
          <p className="text-sm text-muted-foreground">{topic}</p>
          {metaDescription && (
            <p className="text-xs text-muted-foreground mt-1 italic">"{metaDescription}"</p>
          )}
        </div>
        <Badge variant="secondary" className="shrink-0">
          {contentType}
        </Badge>
      </div>

      {/* Content Preview */}
      <ScrollArea className="h-64 w-full rounded-md border bg-muted/30 p-4">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {content.split('\n\n').slice(0, 5).map((paragraph, idx) => (
            <p key={idx} className="mb-3 text-sm leading-relaxed">
              {paragraph}
            </p>
          ))}
          {content.split('\n\n').length > 5 && (
            <p className="text-xs text-muted-foreground italic">
              ... (scroll to see more)
            </p>
          )}
        </div>
      </ScrollArea>

      {/* SEO Info */}
      {(seoKeywords && seoKeywords.length > 0) || readabilityScore !== undefined ? (
        <div className="space-y-2 pt-2 border-t">
          {readabilityScore !== undefined && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Readability Score:</span>
              <Badge variant={readabilityScore >= 60 ? 'default' : 'secondary'}>
                {readabilityScore.toFixed(1)}
              </Badge>
            </div>
          )}
          {seoKeywords && seoKeywords.length > 0 && (
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Keywords:</span>
              <div className="flex flex-wrap gap-1">
                {seoKeywords.slice(0, 5).map((keyword, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="flex-1"
        >
          <Copy className="h-4 w-4 mr-2" />
          Copy
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          className="flex-1"
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleOpenInContent}
          className="flex-1"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Open in Content
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center pt-2 border-t">
        Click "Open in Content" to access advanced features like SEO analysis, variations, and publishing
      </p>
    </Card>
  );
}
