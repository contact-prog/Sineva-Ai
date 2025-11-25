import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Copy, Download, Share2, Clock, Lightbulb } from "lucide-react";
import { toast } from "sonner";

interface PlatformContent {
  mainPost: string;
  caption: string;
  hashtags: string[];
  cta: string;
  bestTime: string;
  contentTips: string;
}

interface PlatformSuiteDisplayProps {
  suite: Record<string, PlatformContent>;
  onCopyPlatform?: (platform: string, content: PlatformContent) => void;
}

const platformColors: Record<string, string> = {
  twitter: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  linkedin: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  instagram: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  facebook: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  tiktok: "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

const platformIcons: Record<string, string> = {
  twitter: "𝕏",
  linkedin: "in",
  instagram: "📷",
  facebook: "f",
  tiktok: "♪",
};

export const PlatformSuiteDisplay = ({ suite, onCopyPlatform }: PlatformSuiteDisplayProps) => {
  const handleCopy = (platform: string, content: PlatformContent) => {
    const fullContent = `${content.mainPost}\n\n${content.caption}\n\n${content.hashtags.map(tag => `#${tag}`).join(' ')}\n\n${content.cta}`;
    navigator.clipboard.writeText(fullContent);
    toast.success(`${platform} content copied to clipboard!`);
    onCopyPlatform?.(platform, content);
  };

  const handleDownload = (platform: string, content: PlatformContent) => {
    const fullContent = `Platform: ${platform.toUpperCase()}\n\nMain Post:\n${content.mainPost}\n\nCaption:\n${content.caption}\n\nHashtags:\n${content.hashtags.map(tag => `#${tag}`).join(' ')}\n\nCall to Action:\n${content.cta}\n\nBest Time to Post:\n${content.bestTime}\n\nContent Tips:\n${content.contentTips}`;
    
    const blob = new Blob([fullContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${platform}-content.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${platform} content downloaded!`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Multi-Platform Content Suite</h3>
          <p className="text-sm text-muted-foreground">Optimized content for each platform</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(suite).map(([platform, content]) => (
          <Card key={platform} className="border-2">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={`${platformColors[platform.toLowerCase()] || 'bg-secondary'} font-bold text-base px-3 py-1`}
                  >
                    {platformIcons[platform.toLowerCase()] || platform.charAt(0).toUpperCase()}
                  </Badge>
                  <div>
                    <CardTitle className="text-lg capitalize">{platform}</CardTitle>
                    <CardDescription className="flex items-center gap-1 text-xs mt-1">
                      <Clock className="h-3 w-3" />
                      {content.bestTime}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopy(platform, content)}
                    className="h-8 w-8"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownload(platform, content)}
                    className="h-8 w-8"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold mb-1">Main Post</h4>
                <p className="text-sm bg-muted p-3 rounded-lg whitespace-pre-wrap">{content.mainPost}</p>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-semibold mb-1">Caption</h4>
                <p className="text-sm text-muted-foreground italic">{content.caption}</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Hashtags</h4>
                <div className="flex flex-wrap gap-1">
                  {content.hashtags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-1">Call to Action</h4>
                <p className="text-sm bg-primary/10 text-primary p-2 rounded border border-primary/20">
                  {content.cta}
                </p>
              </div>

              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-semibold mb-1">Content Tips</h4>
                    <p className="text-xs text-muted-foreground">{content.contentTips}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
