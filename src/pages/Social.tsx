import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Plus, Users, Heart, MessageCircle, TrendingUp, Link as LinkIcon, BarChart3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountConnector } from "@/components/social/AccountConnector";
import { AccountCard } from "@/components/social/AccountCard";
import { PostComposer } from "@/components/social/PostComposer";
import { PostHistoryCard } from "@/components/social/PostHistoryCard";
import { PublishingDashboard } from "@/components/social/PublishingDashboard";
import { PerformanceMonitor } from "@/components/social/PerformanceMonitor";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type SocialAccount = Tables<'social_accounts'>;
type SocialPost = Tables<'social_posts'>;

export default function Social() {
  const [showConnector, setShowConnector] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('social_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('social_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchPosts();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between glass-card p-6 border-l-4 border-primary">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Social Media</h1>
            <p className="text-muted-foreground mt-1">
              Manage and publish content across all your social platforms
            </p>
          </div>
          <Button className="gap-2 hover-glow" onClick={() => setShowComposer(true)}>
            <Plus className="h-4 w-4" />
            Create Post
          </Button>
        </div>

        {/* Connected Accounts Section */}
        <Card className="glass-card border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Connected Accounts</CardTitle>
                <CardDescription>Manage your social media connections</CardDescription>
              </div>
              <Button onClick={() => setShowConnector(true)} variant="outline" className="gap-2 border-primary/30">
                <LinkIcon className="h-4 w-4" />
                Connect Account
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading accounts...</div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Share2 className="h-12 w-12 mx-auto opacity-50 mb-3" />
                <p>No accounts connected yet</p>
                <p className="text-sm mt-1">Connect your social media accounts to get started</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {accounts.map((account) => (
                  <AccountCard 
                    key={account.id} 
                    account={account} 
                    onAccountUpdated={fetchAccounts}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="glass-card border-primary/20 hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Followers</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">12.4K</div>
              <p className="text-xs text-muted-foreground">+2.5% this week</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-primary/20 hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Engagement</CardTitle>
              <Heart className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">3.8K</div>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-primary/20 hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comments</CardTitle>
              <MessageCircle className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">892</div>
              <p className="text-xs text-muted-foreground">+18% from last week</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-primary/20 hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reach</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">45.2K</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Tabs defaultValue="all" className="space-y-4">
              <TabsList>
                <TabsTrigger value="all">All Platforms</TabsTrigger>
                <TabsTrigger value="facebook">Facebook</TabsTrigger>
                <TabsTrigger value="instagram">Instagram</TabsTrigger>
                <TabsTrigger value="twitter">Twitter</TabsTrigger>
                <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
              </TabsList>

          <TabsContent value="all" className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading posts...</div>
            ) : posts.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Posts</CardTitle>
                  <CardDescription>Your latest published content across all platforms</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    <div className="text-center space-y-2">
                      <Share2 className="h-12 w-12 mx-auto opacity-50" />
                      <p>No posts yet</p>
                      <p className="text-sm">Create your first post to get started</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostHistoryCard 
                    key={post.id} 
                    post={post} 
                    onPostUpdated={fetchPosts}
                  />
                ))}
              </div>
            )}
          </TabsContent>

              {["facebook", "instagram", "twitter", "linkedin"].map((platform) => (
                <TabsContent key={platform} value={platform}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="capitalize">{platform} Posts</CardTitle>
                      <CardDescription>Content published on {platform}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-center h-64 text-muted-foreground">
                        <div className="text-center space-y-2">
                          <Share2 className="h-12 w-12 mx-auto opacity-50" />
                          <p className="text-sm capitalize">{platform} content will appear here</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>

          <TabsContent value="analytics">
            <PublishingDashboard />
          </TabsContent>

          <TabsContent value="performance">
            <PerformanceMonitor />
          </TabsContent>
        </Tabs>

        {/* Account Connector Modal */}
        <AccountConnector
          open={showConnector}
          onOpenChange={setShowConnector}
          onAccountConnected={fetchAccounts}
        />

        {/* Post Composer Modal */}
        <PostComposer
          open={showComposer}
          onOpenChange={setShowComposer}
          onPostPublished={() => {
            fetchPosts();
            fetchAccounts();
          }}
        />
      </div>
  );
}
