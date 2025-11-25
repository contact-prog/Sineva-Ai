import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  RefreshCw, 
  Download, 
  TrendingUp, 
  Eye, 
  Heart, 
  MessageCircle, 
  Share2,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';
import { format } from 'date-fns';

type PublishedPost = Tables<'published_posts'>;

export function PublishingDashboard() {
  const [posts, setPosts] = useState<PublishedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalViews: 0,
    totalLikes: 0,
    totalShares: 0,
    totalComments: 0,
    avgEngagement: 0
  });

  useEffect(() => {
    fetchPosts();
    calculateStats();
    
    // Real-time subscription
    const channel = supabase
      .channel('published_posts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'published_posts'
        },
        (payload) => {
          console.log('Real-time update:', payload);
          fetchPosts();
          calculateStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('published_posts')
        .select('*')
        .order('published_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to fetch published posts');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = async () => {
    try {
      const { data, error } = await supabase
        .from('published_posts')
        .select('views, likes, shares, comments');

      if (error) throw error;

      const totals = (data || []).reduce(
        (acc, post) => ({
          totalViews: acc.totalViews + (post.views || 0),
          totalLikes: acc.totalLikes + (post.likes || 0),
          totalShares: acc.totalShares + (post.shares || 0),
          totalComments: acc.totalComments + (post.comments || 0)
        }),
        { totalViews: 0, totalLikes: 0, totalShares: 0, totalComments: 0 }
      );

      const totalEngagement = totals.totalLikes + totals.totalShares + totals.totalComments;
      const avgEngagement = data.length > 0 ? totalEngagement / data.length : 0;

      setStats({
        totalPosts: data.length,
        ...totals,
        avgEngagement
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-social-engagement', {
        body: { syncAll: true }
      });

      if (error) throw error;

      toast.success(`Synced ${data.synced} posts successfully`);
      fetchPosts();
      calculateStats();
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(error.message || 'Failed to sync posts');
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncPost = async (postId: string) => {
    try {
      const { error } = await supabase.functions.invoke('sync-social-engagement', {
        body: { postId }
      });

      if (error) throw error;

      toast.success('Post synced successfully');
      fetchPosts();
      calculateStats();
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(error.message || 'Failed to sync post');
    }
  };

  const handleExport = () => {
    const filteredPosts = selectedPlatform === 'all' 
      ? posts 
      : posts.filter(p => p.platform === selectedPlatform);

    const csv = [
      ['Platform', 'Published Date', 'Content', 'Views', 'Likes', 'Comments', 'Shares', 'URL'].join(','),
      ...filteredPosts.map(post => [
        post.platform,
        post.published_at ? format(new Date(post.published_at), 'yyyy-MM-dd HH:mm') : 'N/A',
        `"${(post.content || '').replace(/"/g, '""').substring(0, 100)}..."`,
        post.views || 0,
        post.likes || 0,
        post.comments || 0,
        post.shares || 0,
        post.external_url
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `social-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Analytics exported successfully');
  };

  const filteredPosts = selectedPlatform === 'all' 
    ? posts 
    : posts.filter(p => p.platform === selectedPlatform);

  const platforms = ['all', ...Array.from(new Set(posts.map(p => p.platform)))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPosts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLikes.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Comments</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalComments.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.avgEngagement)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Tabs value={selectedPlatform} onValueChange={setSelectedPlatform}>
          <TabsList>
            {platforms.map(platform => (
              <TabsTrigger key={platform} value={platform} className="capitalize">
                {platform}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={filteredPosts.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncAll}
            disabled={syncing}
          >
            {syncing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync All
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Posts List */}
      <Card>
        <CardHeader>
          <CardTitle>Published Posts</CardTitle>
          <CardDescription>
            Real-time analytics for your published content ({filteredPosts.length} posts)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {filteredPosts.map((post) => {
                const totalEngagement = (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
                const engagementRate = post.views ? ((totalEngagement / post.views) * 100).toFixed(2) : '0';
                const lastSynced = post.last_synced_at 
                  ? format(new Date(post.last_synced_at), 'MMM d, h:mm a')
                  : 'Never';

                return (
                  <Card key={post.id} className="border-l-4 border-l-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          {/* Header */}
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="capitalize">
                              {post.platform}
                            </Badge>
                            <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                              {post.status}
                            </Badge>
                            {post.sync_failures && post.sync_failures > 0 && (
                              <Badge variant="destructive" className="gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {post.sync_failures} sync failures
                              </Badge>
                            )}
                          </div>

                          {/* Content Preview */}
                          {post.content && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {post.content}
                            </p>
                          )}

                          {/* Metrics */}
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Eye className="h-4 w-4 text-muted-foreground" />
                              <span>{(post.views || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Heart className="h-4 w-4 text-muted-foreground" />
                              <span>{(post.likes || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageCircle className="h-4 w-4 text-muted-foreground" />
                              <span>{(post.comments || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Share2 className="h-4 w-4 text-muted-foreground" />
                              <span>{(post.shares || 0).toLocaleString()}</span>
                            </div>
                          </div>

                          {/* Engagement Bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Engagement Rate</span>
                              <span>{engagementRate}%</span>
                            </div>
                            <Progress value={parseFloat(engagementRate)} className="h-2" />
                          </div>

                          {/* Footer Info */}
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              Published: {post.published_at 
                                ? format(new Date(post.published_at), 'MMM d, yyyy')
                                : 'N/A'}
                            </span>
                            <span>Last synced: {lastSynced}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSyncPost(post.id)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <a href={post.external_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {filteredPosts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <TrendingUp className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No Published Posts</h3>
                  <p className="text-sm text-muted-foreground">
                    Your published posts will appear here with real-time analytics
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
