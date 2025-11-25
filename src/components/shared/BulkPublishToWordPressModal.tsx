import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useConnectedIntegrations } from '@/hooks/useConnectedIntegrations';

interface BulkPublishToWordPressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentItems: Array<{ id: string; topic: string; content: string }>;
}

export function BulkPublishToWordPressModal({ 
  open, 
  onOpenChange, 
  contentItems 
}: BulkPublishToWordPressModalProps) {
  const { integrations } = useConnectedIntegrations();
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [publishStatus, setPublishStatus] = useState<'draft' | 'publish'>('draft');
  const [isPublishing, setIsPublishing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Array<{ topic: string; success: boolean; error?: string }>>([]);

  const wordpressSites = integrations.filter(
    (int) => int.platform === 'wordpress' && int.connected
  );

  const handleBulkPublish = async () => {
    if (!selectedSiteId) {
      toast.error('Please select a WordPress site');
      return;
    }

    setIsPublishing(true);
    setProgress(0);
    setResults([]);

    const totalItems = contentItems.length;
    const publishResults: Array<{ topic: string; success: boolean; error?: string }> = [];

    for (let i = 0; i < contentItems.length; i++) {
      const item = contentItems[i];
      
      try {
        const { data, error } = await supabase.functions.invoke('publish-to-wordpress', {
          body: {
            integrationId: selectedSiteId,
            title: item.topic,
            content: item.content,
            status: publishStatus,
          },
        });

        if (error || !data.success) {
          throw new Error(data.error || 'Failed to publish');
        }

        publishResults.push({ topic: item.topic, success: true });
        toast.success(`Published: ${item.topic}`);
      } catch (error: any) {
        console.error(`Failed to publish ${item.topic}:`, error);
        publishResults.push({ 
          topic: item.topic, 
          success: false, 
          error: error.message 
        });
        toast.error(`Failed: ${item.topic}`);
      }

      setProgress(((i + 1) / totalItems) * 100);
      setResults([...publishResults]);

      // Small delay between requests to avoid rate limiting
      if (i < contentItems.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setIsPublishing(false);
    
    const successCount = publishResults.filter(r => r.success).length;
    toast.success(`Bulk publish complete: ${successCount}/${totalItems} successful`);
  };

  if (wordpressSites.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Bulk Publish to WordPress</DialogTitle>
            <DialogDescription>
              No WordPress sites connected. Please connect a WordPress site first.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={!isPublishing ? onOpenChange : undefined}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Publish to WordPress</DialogTitle>
          <DialogDescription>
            Publish {contentItems.length} items to WordPress
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* WordPress Site Selector */}
          {wordpressSites.length > 1 ? (
            <div className="space-y-2">
              <Label htmlFor="site">WordPress Site</Label>
              <Select value={selectedSiteId} onValueChange={setSelectedSiteId} disabled={isPublishing}>
                <SelectTrigger id="site" className="bg-background">
                  <SelectValue placeholder="Select a site" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {wordpressSites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.metadata?.site_url || site.accountName || 'WordPress Site'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Globe className="w-5 h-5" />
              <span className="text-sm">
                Publishing to: {wordpressSites[0].metadata?.site_url || 'WordPress Site'}
              </span>
            </div>
          )}

          {/* Publish Status */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="publish-status" className="text-base">
                Publish Immediately
              </Label>
              <p className="text-sm text-muted-foreground">
                {publishStatus === 'publish' 
                  ? 'Posts will be published immediately' 
                  : 'Posts will be saved as drafts'}
              </p>
            </div>
            <Switch
              id="publish-status"
              checked={publishStatus === 'publish'}
              onCheckedChange={(checked) => setPublishStatus(checked ? 'publish' : 'draft')}
              disabled={isPublishing}
            />
          </div>

          {/* Progress */}
          {isPublishing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Publishing...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <Label>Results</Label>
              {results.map((result, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                >
                  <span className="text-sm truncate flex-1">{result.topic}</span>
                  {result.success ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Items Preview */}
          {!isPublishing && results.length === 0 && (
            <div className="space-y-2">
              <Label>Items to publish ({contentItems.length})</Label>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {contentItems.map((item, index) => (
                  <div key={index} className="p-2 rounded bg-muted/30 text-sm truncate">
                    {item.topic}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={isPublishing}
          >
            {isPublishing ? 'Publishing...' : 'Cancel'}
          </Button>
          <Button 
            onClick={handleBulkPublish} 
            disabled={isPublishing || !selectedSiteId}
          >
            {isPublishing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isPublishing 
              ? `Publishing ${Math.round(progress)}%` 
              : `Publish ${contentItems.length} Items`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
