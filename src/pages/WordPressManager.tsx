import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
  RefreshCw, 
  ExternalLink, 
  Edit, 
  Trash2, 
  MessageSquare, 
  Eye,
  Calendar,
  Search,
  Filter,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface WordPressPost {
  id: string;
  external_id: string;
  external_url: string;
  content: string | null;
  status: string;
  published_at: string | null;
  comments: number | null;
  views: number | null;
  last_synced_at: string;
  integration_id: string;
  sync_metadata: any;
}

export default function WordPressManager() {
  const [posts, setPosts] = useState<WordPressPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [sites, setSites] = useState<any[]>([]);

  useEffect(() => {
    fetchPosts();
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', 'wordpress')
        .eq('connected', true);

      if (data) {
        setSites(data);
      }
    } catch (error) {
      console.error('Error fetching sites:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('published_posts')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', 'wordpress')
        .order('published_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load WordPress posts');
    } finally {
      setLoading(false);
    }
  };

  const syncPostAnalytics = async (postId: string) => {
    try {
      setSyncing(postId);
      const { data, error } = await supabase.functions.invoke('sync-wordpress-analytics', {
        body: { postId }
      });

      if (error) throw error;

      toast.success('Analytics synced successfully');
      await fetchPosts();
    } catch (error: any) {
      console.error('Error syncing analytics:', error);
      toast.error(error.message || 'Failed to sync analytics');
    } finally {
      setSyncing(null);
    }
  };

  const syncAllPosts = async () => {
    toast.info('Syncing all posts...', { duration: 2000 });
    for (const post of filteredPosts) {
      await syncPostAnalytics(post.id);
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const getPostTitle = (post: WordPressPost): string => {
    return post.sync_metadata?.title || 'Untitled Post';
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = getPostTitle(post).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
    const matchesSite = siteFilter === 'all' || post.integration_id === siteFilter;
    return matchesSearch && matchesStatus && matchesSite;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'publish': return 'bg-green-500';
      case 'draft': return 'bg-yellow-500';
      case 'pending': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">WordPress Content Manager</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track your published WordPress posts
          </p>
        </div>
        <Button onClick={syncAllPosts} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Sync All Posts
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="publish">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>

          {sites.length > 1 && (
            <Select value={siteFilter} onValueChange={setSiteFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by site" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">All Sites</SelectItem>
                {sites.map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.metadata?.site_url || 'WordPress Site'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </Card>

      {/* Posts List */}
      {filteredPosts.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            {posts.length === 0 
              ? 'No WordPress posts published yet. Create your first blog post in the Content Generator!'
              : 'No posts match your filters.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <Card key={post.id} className="p-6 hover:border-primary/50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">
                      {getPostTitle(post)}
                    </h3>
                    <Badge className={getStatusColor(post.status)}>
                      {post.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    {post.published_at && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(post.published_at), 'MMM dd, yyyy')}
                      </div>
                    )}
                    {post.comments !== null && post.comments > 0 && (
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        {post.comments} comments
                      </div>
                    )}
                    {post.views !== null && post.views > 0 && (
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        {post.views} views
                      </div>
                    )}
                  </div>

                  {post.sync_metadata?.excerpt && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {post.sync_metadata.excerpt.replace(/<[^>]*>/g, '')}
                    </p>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Last synced: {format(new Date(post.last_synced_at), 'MMM dd, yyyy HH:mm')}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => syncPostAnalytics(post.id)}
                    disabled={syncing === post.id}
                  >
                    {syncing === post.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(post.external_url, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
