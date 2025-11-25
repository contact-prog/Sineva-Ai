import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Download, Trash2, Search, Loader2, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ImagePreviewDialog } from './ImagePreviewDialog';

interface Graphic {
  id: string;
  image_url: string;
  prompt: string;
  platform: string;
  dimensions: string;
  created_at: string;
  content_type: string;
}

export function GraphicsGrid() {
  const [graphics, setGraphics] = useState<Graphic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedGraphic, setSelectedGraphic] = useState<Graphic | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadGraphics();
  }, []);

  const loadGraphics = async () => {
    try {
      const { data, error } = await supabase
        .from('graphic_generations')
        .select('id, image_url, prompt, platform, dimensions, created_at, content_type')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setGraphics(data || []);
    } catch (error) {
      console.error('Error loading graphics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load graphics',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('graphic_generations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setGraphics(graphics.filter(g => g.id !== id));
      toast({
        title: 'Success',
        description: 'Graphic deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting graphic:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete graphic',
        variant: 'destructive'
      });
    }
  };

  const filteredGraphics = graphics.filter(g =>
    g.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.platform.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="aspect-square w-full mb-4" />
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-3 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by prompt or platform..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {filteredGraphics.length} graphic{filteredGraphics.length !== 1 ? 's' : ''} found
      </div>

      {/* Graphics Grid */}
      {filteredGraphics.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No graphics found</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredGraphics.map((graphic) => (
              <Card 
                key={graphic.id} 
                className="group overflow-hidden border border-border/30 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedGraphic(graphic);
                  setPreviewOpen(true);
                }}
              >
                <div className="relative aspect-square">
                  <img
                    src={graphic.image_url}
                    alt={graphic.prompt}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedGraphic(graphic);
                        setPreviewOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(
                          graphic.image_url,
                          `${graphic.platform}-${graphic.dimensions}.png`
                        );
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(graphic.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                {/* Platform Badge */}
                <Badge className="absolute top-2 left-2 capitalize text-xs">
                  {graphic.platform}
                </Badge>

                {/* Dimensions Badge */}
                <Badge variant="outline" className="absolute bottom-2 right-2 bg-background/90 backdrop-blur text-xs">
                  {graphic.dimensions}
                </Badge>
              </div>

              {/* Details */}
              <div className="p-3">
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {graphic.prompt}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(graphic.created_at).toLocaleDateString()}
                </p>
              </div>
              </Card>
            ))}
          </div>

          <ImagePreviewDialog
            open={previewOpen}
            onOpenChange={setPreviewOpen}
            image={selectedGraphic ? {
              id: selectedGraphic.id,
              url: selectedGraphic.image_url,
              prompt: selectedGraphic.prompt,
              platform: selectedGraphic.platform,
              dimensions: selectedGraphic.dimensions,
              created_at: selectedGraphic.created_at,
            } : null}
            onDownload={() => selectedGraphic && handleDownload(
              selectedGraphic.image_url,
              `${selectedGraphic.platform}-${selectedGraphic.dimensions}.png`
            )}
          />
        </>
      )}
    </div>
  );
}
