import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Facebook, Instagram, Twitter, Linkedin, Heart, MessageCircle, Share2, MoreVertical, RefreshCw, Trash2, Eye } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import type { Tables } from '@/integrations/supabase/types';

type SocialPost = Tables<'social_posts'>;

interface PostHistoryCardProps {
  post: SocialPost;
  onPostUpdated: () => void;
}

const platformConfig = {
  facebook: { icon: Facebook, color: 'bg-[#1877F2]', name: 'Facebook' },
  instagram: { icon: Instagram, color: 'bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCAF45]', name: 'Instagram' },
  twitter: { icon: Twitter, color: 'bg-[#1DA1F2]', name: 'Twitter' },
  linkedin: { icon: Linkedin, color: 'bg-[#0A66C2]', name: 'LinkedIn' }
};

export function PostHistoryCard({ post, onPostUpdated }: PostHistoryCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const engagementStats = post.engagement_stats as any || {};
  const totalLikes = engagementStats.likes || 0;
  const totalComments = engagementStats.comments || 0;
  const totalShares = engagementStats.shares || 0;

  const statusColors = {
    draft: 'secondary',
    scheduled: 'default',
    publishing: 'default',
    published: 'default',
    partial: 'outline',
    failed: 'destructive'
  } as const;

  const handleSyncEngagement = async () => {
    setIsSyncing(true);
    try {
      const { error } = await supabase.functions.invoke('sync-social-engagement', {
        body: { postId: post.id }
      });

      if (error) throw error;

      toast.success('Engagement metrics synced');
      onPostUpdated();
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(error.message || 'Failed to sync engagement');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('social_posts')
        .delete()
        .eq('id', post.id);

      if (error) throw error;

      toast.success('Post deleted');
      onPostUpdated();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete post');
    } finally {
      setIsDeleting(false);
    }
  };

  const getPostPlatforms = () => {
    // Get unique platforms from platform_post_ids
    const platformPostIds = post.platform_post_ids as Record<string, string> || {};
    return Object.keys(platformPostIds);
  };

  const platforms = getPostPlatforms();

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Platform Icons */}
          <div className="flex flex-col gap-1">
            {platforms.map((platform) => {
              const config = platformConfig[platform as keyof typeof platformConfig];
              if (!config) return null;
              const Icon = config.icon;
              return (
                <Avatar key={platform} className="h-8 w-8">
                  <AvatarFallback className={config.color}>
                    <Icon className="h-4 w-4 text-white" />
                  </AvatarFallback>
                </Avatar>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge variant={statusColors[post.status as keyof typeof statusColors] || 'secondary'}>
                  {post.status}
                </Badge>
                {post.scheduled_at && new Date(post.scheduled_at) > new Date() && (
                  <span className="text-xs text-muted-foreground">
                    Scheduled for {formatDistanceToNow(new Date(post.scheduled_at), { addSuffix: true })}
                  </span>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {post.status === 'published' && (
                    <DropdownMenuItem onClick={handleSyncEngagement} disabled={isSyncing}>
                      <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                      Sync Engagement
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={handleDelete} 
                    disabled={isDeleting}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <p className="text-sm mb-3 line-clamp-3">{post.content}</p>

            {/* Media Preview */}
            {post.media_urls && post.media_urls.length > 0 && (
              <div className="flex gap-2 mb-3 overflow-x-auto">
                {post.media_urls.slice(0, 3).map((url, index) => (
                  <div key={index} className="w-20 h-20 bg-muted rounded flex-shrink-0 overflow-hidden">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
                {post.media_urls.length > 3 && (
                  <div className="w-20 h-20 bg-muted rounded flex-shrink-0 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">+{post.media_urls.length - 3}</span>
                  </div>
                )}
              </div>
            )}

            {/* Engagement Stats */}
            {post.status === 'published' && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  {totalLikes.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-4 h-4" />
                  {totalComments.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Share2 className="w-4 h-4" />
                  {totalShares.toLocaleString()}
                </span>
                <span className="ml-auto text-xs">
                  {formatDistanceToNow(new Date(post.published_at || post.created_at), { addSuffix: true })}
                </span>
              </div>
            )}

            {!post.published_at && post.created_at && (
              <p className="text-xs text-muted-foreground">
                Created {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
