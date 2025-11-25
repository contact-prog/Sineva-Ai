import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Trash2, 
  ExternalLink,
  Loader2,
  Info
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Integration = Tables<'social_accounts'>;

interface PlatformCardProps {
  platform: string;
  integration?: Integration;
  onUpdate: () => void;
}

const platformInfo: Record<string, {
  name: string;
  icon: string;
  description: string;
  setupGuide: string[];
  requiredScopes: string[];
}> = {
  facebook: {
    name: 'Facebook',
    icon: '📘',
    description: 'Post to Facebook pages and profiles',
    setupGuide: [
      '1. Go to Facebook Developers Console',
      '2. Create a new app or select existing',
      '3. Add Facebook Login product',
      '4. Configure OAuth redirect URLs',
      '5. Request pages_manage_posts permission'
    ],
    requiredScopes: ['pages_manage_posts', 'pages_read_engagement']
  },
  instagram: {
    name: 'Instagram',
    icon: '📷',
    description: 'Share content to Instagram Business accounts',
    setupGuide: [
      '1. Connect Instagram Business account to Facebook Page',
      '2. Use Facebook Developers Console',
      '3. Enable Instagram Graph API',
      '4. Request instagram_basic and instagram_content_publish',
      '5. Configure OAuth callback'
    ],
    requiredScopes: ['instagram_basic', 'instagram_content_publish']
  },
  twitter: {
    name: 'Twitter/X',
    icon: '🐦',
    description: 'Post tweets and manage your Twitter account',
    setupGuide: [
      '1. Go to Twitter Developer Portal',
      '2. Create a new app or select existing',
      '3. Enable OAuth 1.0a or OAuth 2.0',
      '4. Set callback URL to your domain',
      '5. Request Read and Write permissions'
    ],
    requiredScopes: ['tweet.read', 'tweet.write', 'users.read']
  },
  linkedin: {
    name: 'LinkedIn',
    icon: '💼',
    description: 'Share professional content on LinkedIn',
    setupGuide: [
      '1. Go to LinkedIn Developers',
      '2. Create a new app',
      '3. Request Sign In with LinkedIn and Share on LinkedIn products',
      '4. Add OAuth redirect URL',
      '5. Verify your app domain'
    ],
    requiredScopes: ['w_member_social', 'r_liteprofile', 'r_emailaddress']
  }
};

export function PlatformCard({ platform, integration, onUpdate }: PlatformCardProps) {
  const [testing, setTesting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const info = platformInfo[platform];
  if (!info) return null;

  const isExpired = integration?.token_expires_at 
    ? new Date(integration.token_expires_at) < new Date()
    : false;

  const isConnected = !!integration && integration.is_active && !isExpired;
  const needsRepair = !!integration && (!integration.is_active || isExpired);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('social-auth-initiate', {
        body: { platform }
      });

      if (error) throw error;

      const { oauthUrl, stateData } = data as { oauthUrl: string; stateData?: any };

      if (!oauthUrl) {
        throw new Error('Missing OAuth URL from server');
      }

      if (stateData) {
        sessionStorage.setItem('oauth_state', JSON.stringify(stateData));
      }

      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        oauthUrl,
        `${platform}_oauth`,
        `width=${width},height=${height},left=${left},top=${top}`
      );

      const handleMessage = async (event: MessageEvent) => {
        if (event.data.type === 'oauth_callback') {
          const { code, state } = event.data;
          const storedState = JSON.parse(sessionStorage.getItem('oauth_state') || '{}');

          if (storedState.state && state !== storedState.state) {
            toast.error('Security verification failed. Please try again.');
            return;
          }

          const { error: callbackError } = await supabase.functions.invoke('social-auth-callback', {
            body: { code, state, platform }
          });

          if (callbackError) {
            toast.error(`Failed to connect ${info.name}: ${callbackError.message}`);
          } else {
            toast.success(`Successfully connected ${info.name}!`);
            onUpdate();
          }

          sessionStorage.removeItem('oauth_state');
          window.removeEventListener('message', handleMessage);
          popup?.close();
        }
      };

      window.addEventListener('message', handleMessage);

      if (!popup || popup.closed) {
        toast.error('Popup blocked. Please allow popups for this site.');
      }

    } catch (error: any) {
      console.error('Connection error:', error);
      toast.error(error.message || `Failed to connect ${info.name}`);
    } finally {
      setConnecting(false);
    }
  };

  const handleTest = async () => {
    if (!integration) return;
    
    setTesting(true);
    try {
      const { error } = await supabase.functions.invoke('get-social-stats', {
        body: { platform: integration.platform, limit: 5 }
      });

      if (error) throw error;

      toast.success(`${info.name} connection is responding (stats fetched).`);
    } catch (error: any) {
      console.error('Test error:', error);
      toast.error(`${info.name} connection test failed: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleRefresh = async () => {
    if (!integration) return;

    setRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke('social-refresh-token', {
        body: { accountId: integration.id }
      });

      if (error) throw error;

      toast.success(`${info.name} token refreshed successfully`);
      onUpdate();
    } catch (error: any) {
      console.error('Refresh error:', error);
      toast.error(`Failed to refresh ${info.name} token: ${error.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!integration) return;

    setDisconnecting(true);
    try {
      const { error } = await supabase
        .from('social_accounts')
        .delete()
        .eq('id', integration.id);

      if (error) throw error;

      toast.success(`${info.name} disconnected successfully`);
      onUpdate();
    } catch (error: any) {
      console.error('Disconnect error:', error);
      toast.error(`Failed to disconnect ${info.name}`);
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <Card className={needsRepair ? 'border-destructive' : isConnected ? 'border-primary/20' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl">{info.icon}</div>
            <div>
              <CardTitle className="flex items-center gap-2">
                {info.name}
                {isConnected && (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Connected
                  </Badge>
                )}
                {needsRepair && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Needs Repair
                  </Badge>
                )}
                {!isConnected && !needsRepair && (
                  <Badge variant="secondary">Not Connected</Badge>
                )}
              </CardTitle>
              <CardDescription>{info.description}</CardDescription>
            </div>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Info className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Setup Guide: {info.name}</DialogTitle>
                <DialogDescription>
                  Follow these steps to connect your {info.name} account
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Setup Steps</h4>
                  <ol className="space-y-2 text-sm text-muted-foreground">
                    {info.setupGuide.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Required Scopes</h4>
                  <div className="flex flex-wrap gap-2">
                    {info.requiredScopes.map(scope => (
                      <Badge key={scope} variant="outline">{scope}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {integration && (
          <div className="space-y-2 text-sm">
            {integration.account_name && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account:</span>
                <span className="font-medium">{integration.account_name}</span>
              </div>
            )}
            {integration.token_expires_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Token Expires:</span>
                <span className={isExpired ? 'text-destructive' : ''}>
                  {new Date(integration.token_expires_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          {!isConnected ? (
            <Button onClick={handleConnect} className="flex-1">
              Connect {info.name}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={testing}
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Test'
                )}
              </Button>
              
              {integration?.refresh_token && (isExpired || needsRepair) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </>
                  )}
                </Button>
              )}
              
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                {disconnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Disconnect
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
