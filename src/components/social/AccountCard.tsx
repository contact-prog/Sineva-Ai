import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Facebook, Instagram, Linkedin, Twitter, MoreVertical, RefreshCw, Trash2, Globe } from 'lucide-react';
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

interface AccountCardProps {
  account: SocialAccount;
  onAccountUpdated: () => void;
}

const platformConfig = {
  facebook: { icon: Facebook, color: 'bg-[#1877F2]', name: 'Facebook' },
  instagram: { icon: Instagram, color: 'bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCAF45]', name: 'Instagram' },
  twitter: { icon: Twitter, color: 'bg-[#1DA1F2]', name: 'Twitter' },
  linkedin: { icon: Linkedin, color: 'bg-[#0A66C2]', name: 'LinkedIn' }
};

const defaultConfig = { 
  icon: Globe, 
  color: 'bg-primary', 
  name: 'Social Account' 
};

export function AccountCard({ account, onAccountUpdated }: AccountCardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const config = platformConfig[account.platform as keyof typeof platformConfig] || defaultConfig;
  const Icon = config.icon;

  const isExpiringSoon = account.token_expires_at 
    ? new Date(account.token_expires_at).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000
    : false;

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

  const handleDelete = async () => {
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
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-3 rounded-lg ${config.color} flex-shrink-0`}>
            <Icon className="w-6 h-6 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{account.account_name}</h3>
              {account.is_active ? (
                <Badge variant="default" className="bg-green-500">Active</Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
              {isExpiringSoon && (
                <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                  Expiring Soon
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{config.name}</p>
            {account.token_expires_at && (
              <p className="text-xs text-muted-foreground mt-1">
                Token expires: {new Date(account.token_expires_at).toLocaleDateString()}
              </p>
            )}
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
                onClick={handleDelete} 
                disabled={isDeleting}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
