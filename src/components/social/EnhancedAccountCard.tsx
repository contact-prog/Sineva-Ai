import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Facebook, Instagram, Linkedin, Twitter, MoreVertical, RefreshCw, Trash2, Users, FileText } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type SocialAccount = Tables<'social_accounts'>;

interface EnhancedAccountCardProps {
  account: SocialAccount;
  onAccountUpdated: () => void;
}

const platformConfig = {
  facebook: { 
    icon: Facebook, 
    color: 'bg-[#1877F2]', 
    name: 'Facebook',
    gradient: 'from-[#1877F2] to-[#0d5dbd]'
  },
  instagram: { 
    icon: Instagram, 
    color: 'bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCAF45]', 
    name: 'Instagram',
    gradient: 'from-[#833AB4] via-[#FD1D1D] to-[#FCAF45]'
  },
  twitter: { 
    icon: Twitter, 
    color: 'bg-[#1DA1F2]', 
    name: 'Twitter',
    gradient: 'from-[#1DA1F2] to-[#0d8dd8]'
  },
  linkedin: { 
    icon: Linkedin, 
    color: 'bg-[#0A66C2]', 
    name: 'LinkedIn',
    gradient: 'from-[#0A66C2] to-[#084d92]'
  }
};

export function EnhancedAccountCard({ account, onAccountUpdated }: EnhancedAccountCardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const config = platformConfig[account.platform as keyof typeof platformConfig];
  const Icon = config.icon;

  const isExpiringSoon = account.token_expires_at 
    ? new Date(account.token_expires_at).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000
    : false;

  const isExpired = account.token_expires_at
    ? new Date(account.token_expires_at).getTime() < Date.now()
    : false;

  // Extract metrics from metadata
  const profileData = account.metadata as any;
  const profileImage = profileData?.profile?.profile_image_url || profileData?.profile?.picture;
  const followerCount = profileData?.metrics?.followers_count || 0;
  const postsCount = profileData?.metrics?.posts_count || 0;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke('social-refresh-token', {
        body: { accountId: account.id }
      });

      if (error) throw error;

      toast.success('Token refreshed successfully');
      onAccountUpdated();
    } catch (error: any) {
      console.error('Token refresh error:', error);
      toast.error(error.message || 'Failed to refresh token');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm(`Are you sure you want to disconnect ${account.account_name}?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('social_accounts')
        .delete()
        .eq('id', account.id);

      if (error) throw error;

      toast.success('Account disconnected');
      onAccountUpdated();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to disconnect account');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Platform Header with Gradient */}
      <div className={`h-20 bg-gradient-to-r ${config.gradient} relative`}>
        <div className="absolute -bottom-8 left-4">
          <Avatar className="h-16 w-16 border-4 border-background">
            <AvatarImage src={profileImage} />
            <AvatarFallback className={config.color}>
              <Icon className="h-8 w-8 text-white" />
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <CardContent className="pt-12 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg truncate">{account.account_name}</h3>
              {isExpired ? (
                <Badge variant="destructive">Expired</Badge>
              ) : !account.is_active ? (
                <Badge variant="secondary">Inactive</Badge>
              ) : isExpiringSoon ? (
                <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                  Expiring Soon
                </Badge>
              ) : (
                <Badge variant="default" className="bg-green-500">Active</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{config.name}</p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="flex-shrink-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {account.refresh_token && (
                <DropdownMenuItem onClick={handleRefresh} disabled={isRefreshing}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh Token
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={handleDisconnect} 
                disabled={isDeleting}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Account Metrics */}
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="font-semibold">{followerCount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Followers</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="font-semibold">{postsCount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Posts</p>
            </div>
          </div>
        </div>

        {/* Token Expiry Info */}
        {account.token_expires_at && (
          <div className="text-xs text-muted-foreground pt-3 border-t">
            Token expires: {new Date(account.token_expires_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
