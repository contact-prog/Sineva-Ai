import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Share2, Plus, CheckCircle2, Mail } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { useNavigate } from 'react-router-dom';
import { ShareToSocialModal } from '@/components/shared/ShareToSocialModal';
import { useShareContent } from '@/hooks/useShareContent';

interface GraphicBatchCardProps {
  results: Array<{
    id: string;
    url: string;
    platform?: string;
    formatName?: string;
    dimensions?: string;
    metadata?: any;
  }>;
}

export default function GraphicBatchCard({ results }: GraphicBatchCardProps) {
  const { resetWorkflow } = useChat();
  const navigate = useNavigate();
  const { isSocialModalOpen, setIsSocialModalOpen, shareData, openSocialModal } = useShareContent();

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = async () => {
    results.forEach((result, index) => {
      setTimeout(() => {
        const filename = `${result.platform || 'graphic'}-${result.formatName || index}-${result.dimensions || 'image'}.png`;
        handleDownload(result.url, filename);
      }, index * 200); // Stagger downloads
    });
  };

  const handleShareToSocial = () => {
    const imageUrls = results.map(r => r.url);
    openSocialModal({
      content: `Check out our latest graphics! #design #marketing`,
      mediaUrls: imageUrls
    });
  };

  const handleCreateNew = async () => {
    await resetWorkflow();
  };

  // Group results by platform
  const groupedResults = results.reduce((acc, result) => {
    const platform = result.platform || 'other';
    if (!acc[platform]) acc[platform] = [];
    acc[platform].push(result);
    return acc;
  }, {} as Record<string, typeof results>);

  return (
    <Card className="p-6 space-y-6 border-primary/20 bg-card/50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <h3 className="text-lg font-semibold">
            {results.length} Graphic{results.length !== 1 ? 's' : ''} Generated
          </h3>
        </div>
        <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20">
          Complete
        </Badge>
      </div>

      {/* Results Grid */}
      <div className="space-y-4">
        {Object.entries(groupedResults).map(([platform, platformResults]) => (
          <div key={platform} className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground capitalize">
              {platform}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {platformResults.map((result) => (
                <div
                  key={result.id}
                  className="group relative aspect-square rounded-lg overflow-hidden bg-muted border border-border hover:border-primary/50 transition-all"
                >
                  <img
                    src={result.url}
                    alt={`${result.platform} ${result.formatName}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDownload(
                        result.url,
                        `${result.platform}-${result.formatName}-${result.dimensions}.png`
                      )}
                      className="w-full gap-2"
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </Button>
                  </div>

                  {/* Format Badge */}
                  <Badge 
                    variant="secondary" 
                    className="absolute top-2 left-2 text-xs bg-background/80 backdrop-blur"
                  >
                    {result.formatName}
                  </Badge>

                  {/* Dimensions Badge */}
                  {result.dimensions && (
                    <Badge 
                      variant="outline" 
                      className="absolute bottom-2 right-2 text-xs bg-background/80 backdrop-blur"
                    >
                      {result.dimensions}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bulk Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Button
          variant="outline"
          onClick={handleDownloadAll}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Download All
        </Button>
        <Button
          variant="outline"
          onClick={handleShareToSocial}
          className="gap-2"
        >
          <Share2 className="h-4 w-4" />
          Share to Social
        </Button>
        <Button
          onClick={handleCreateNew}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Create New
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        All graphics saved to your library
      </p>

      <ShareToSocialModal
        open={isSocialModalOpen}
        onOpenChange={setIsSocialModalOpen}
        content={shareData.content}
        mediaUrls={shareData.mediaUrls}
      />
    </Card>
  );
}
