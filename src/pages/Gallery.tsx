import { useEffect, useState } from 'react';
import { Search, Filter, Grid, List, Image as ImageIcon, Video as VideoIcon, Download, Calendar, DollarSign, Trash2, FileText } from 'lucide-react';
import BlogList from '@/components/gallery/BlogList';
import { ImagePreviewDialog } from '@/components/gallery/ImagePreviewDialog';
import { VideoPreviewDialog } from '@/components/gallery/VideoPreviewDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface GalleryItem {
  id: string;
  type: 'video' | 'image';
  url: string;
  thumbnail?: string;
  prompt: string;
  status?: string;
  cost?: number;
  duration?: number;
  dimensions?: string;
  platform?: string;
  created_at: string;
}

const Gallery = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'date' | 'cost' | 'type'>('date');
  const [filterType, setFilterType] = useState<'all' | 'video' | 'image' | 'blog'>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<GalleryItem | null>(null);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [videoPreviewOpen, setVideoPreviewOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);

  useEffect(() => {
    loadGalleryItems();
    
    // Setup realtime subscriptions for both tables
    const videoChannel = supabase
      .channel('video-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_generations'
        },
        () => {
          console.log('Video data changed, reloading gallery');
          loadGalleryItems();
        }
      )
      .subscribe();

    const graphicChannel = supabase
      .channel('graphic-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'graphic_generations'
        },
        () => {
          console.log('Graphic data changed, reloading gallery');
          loadGalleryItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(videoChannel);
      supabase.removeChannel(graphicChannel);
    };
  }, []);

  useEffect(() => {
    filterAndSortItems();
  }, [items, searchQuery, sortBy, filterType]);

  const loadGalleryItems = async () => {
    setIsLoading(true);
    try {
      // Fetch videos
      const { data: videos, error: videosError } = await supabase
        .from('video_generations')
        .select('*')
        .order('created_at', { ascending: false });

      if (videosError) throw videosError;

      // Fetch graphics
      const { data: graphics, error: graphicsError } = await supabase
        .from('graphic_generations')
        .select('*')
        .order('created_at', { ascending: false });

      if (graphicsError) throw graphicsError;

      // Transform videos to gallery items
      const videoItems: GalleryItem[] = (videos || []).map(v => ({
        id: v.id,
        type: 'video' as const,
        url: v.video_url || '',
        // Prefer explicit thumbnail, then first/last frame fallbacks
        thumbnail: v.thumbnail_url || v.first_frame_url || v.last_frame_url || undefined,
        prompt: v.user_prompt || v.prompt,
        status: v.status,
        cost: v.cost_usd,
        duration: v.duration_seconds,
        platform: v.platforms?.[0],
        created_at: v.created_at,
      }));

      // Transform graphics to gallery items
      const imageItems: GalleryItem[] = (graphics || []).map(g => ({
        id: g.id,
        type: 'image' as const,
        url: g.image_url,
        prompt: g.prompt,
        cost: g.cost_estimate,
        dimensions: g.dimensions,
        platform: g.platform,
        created_at: g.created_at,
      }));

      setItems([...videoItems, ...imageItems]);
    } catch (error) {
      console.error('Error loading gallery:', error);
      toast({
        title: 'Error',
        description: 'Failed to load gallery items',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortItems = () => {
    let filtered = [...items];

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.type === filterType);
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.prompt.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'cost') {
        return (b.cost || 0) - (a.cost || 0);
      } else if (sortBy === 'type') {
        return a.type.localeCompare(b.type);
      }
      return 0;
    });

    setFilteredItems(filtered);
  };

  const handleItemClick = (item: GalleryItem) => {
    setSelectedItem(item);
    if (item.type === 'video') {
      setVideoPreviewOpen(true);
    } else {
      setImagePreviewOpen(true);
    }
  };

  const handleDownload = async (item: GalleryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(item.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${item.type}-${item.id}.${item.type === 'video' ? 'mp4' : 'png'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Download Started',
        description: `Downloading ${item.type}...`
      });
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: 'Could not download file',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteClick = (item: GalleryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      const tableName = itemToDelete.type === 'video' ? 'video_generations' : 'graphic_generations';
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', itemToDelete.id);

      if (error) throw error;

      // Remove from local state
      setItems(items.filter(item => item.id !== itemToDelete.id));
      
      toast({
        title: 'Deleted',
        description: `${itemToDelete.type === 'video' ? 'Video' : 'Graphic'} deleted successfully`
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete item',
        variant: 'destructive'
      });
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-7xl py-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Media Gallery</h1>
            <p className="text-muted-foreground mt-1">
              {items.filter(i => i.type === 'video').length} videos · {items.filter(i => i.type === 'image').length} graphics · ${items.reduce((sum, item) => sum + (item.cost || 0), 0).toFixed(2)} total
            </p>
            {filterType === 'blog' && (
              <p className="text-muted-foreground mt-1">
                View and manage all your generated blog posts
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by prompt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)} className="w-full md:w-auto">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="video">Videos</TabsTrigger>
              <TabsTrigger value="image">Graphics</TabsTrigger>
              <TabsTrigger value="blog">Blogs</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="cost">Cost</SelectItem>
              <SelectItem value="type">Type</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content Area */}
      {filterType === 'blog' ? (
        <BlogList />
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <p className="text-muted-foreground">No items found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Try adjusting your filters or create some content
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' 
          : 'space-y-4'
        }>
          {filteredItems.map((item) => (
            <Card 
              key={item.id} 
              className="border border-border/30 overflow-hidden hover:shadow-md transition-all cursor-pointer group"
              onClick={() => handleItemClick(item)}
            >
              <div className="relative aspect-video bg-muted overflow-hidden">
                {item.type === 'video' ? (
                  <>
                    <video
                      src={`${item.url}#t=0.1`}
                      className="w-full h-full object-cover"
                      preload="metadata"
                      muted
                      playsInline
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <VideoIcon className="h-12 w-12 text-white" />
                    </div>
                    {item.status === 'generating' && (
                      <Badge className="absolute top-2 right-2 animate-pulse">Generating</Badge>
                    )}
                  </>
                ) : (
                  <>
                    <img
                      src={item.url}
                      alt={item.prompt}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-white" />
                    </div>
                  </>
                )}
              </div>
              <CardContent className="p-3 space-y-2">
                <p className="text-sm line-clamp-2">{item.prompt}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <Badge variant="secondary" className="capitalize text-xs">
                    {item.type}
                  </Badge>
                  {item.platform && (
                    <Badge variant="outline" className="capitalize text-xs">
                      {item.platform}
                    </Badge>
                  )}
                  {item.duration && (
                    <span>{item.duration}s</span>
                  )}
                  {item.cost && (
                    <span>${item.cost.toFixed(2)}</span>
                  )}
                  <span className="flex items-center gap-1 ml-auto">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(item.created_at), 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="flex gap-1 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 flex-1"
                    onClick={(e) => handleDownload(item, e)}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-destructive hover:text-destructive"
                    onClick={(e) => handleDeleteClick(item, e)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Image Preview Dialog */}
      <ImagePreviewDialog
        open={imagePreviewOpen}
        onOpenChange={setImagePreviewOpen}
        image={selectedItem && selectedItem.type === 'image' ? {
          id: selectedItem.id,
          url: selectedItem.url,
          prompt: selectedItem.prompt,
          platform: selectedItem.platform,
          dimensions: selectedItem.dimensions,
          cost: selectedItem.cost,
          created_at: selectedItem.created_at,
        } : null}
        onDownload={() => selectedItem && handleDownload(selectedItem, {} as React.MouseEvent)}
      />

      {/* Video Preview Dialog */}
      <VideoPreviewDialog
        open={videoPreviewOpen}
        onOpenChange={setVideoPreviewOpen}
        video={selectedItem && selectedItem.type === 'video' ? {
          id: selectedItem.id,
          url: selectedItem.url,
          thumbnail: selectedItem.thumbnail,
          prompt: selectedItem.prompt,
          platform: selectedItem.platform,
          duration: selectedItem.duration,
          cost: selectedItem.cost,
          status: selectedItem.status,
          created_at: selectedItem.created_at,
        } : null}
        onDownload={() => selectedItem && handleDownload(selectedItem, {} as React.MouseEvent)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this {itemToDelete?.type === 'video' ? 'video' : 'graphic'}. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Gallery;
