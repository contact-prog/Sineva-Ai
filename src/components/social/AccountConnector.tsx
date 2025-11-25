import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Facebook, Instagram, Linkedin, Twitter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AccountConnectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccountConnected: () => void;
}

const platforms = [
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    color: 'bg-[#1877F2]',
    description: 'Connect your Facebook Page'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: 'bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCAF45]',
    description: 'Connect your Instagram Business account'
  },
  {
    id: 'twitter',
    name: 'Twitter',
    icon: Twitter,
    color: 'bg-[#1DA1F2]',
    description: 'Connect your Twitter account'
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'bg-[#0A66C2]',
    description: 'Connect your LinkedIn Page'
  }
];

export function AccountConnector({ open, onOpenChange, onAccountConnected }: AccountConnectorProps) {
  const [connecting, setConnecting] = useState<string | null>(null);

  const handleConnect = async (platformId: string) => {
    setConnecting(platformId);
    
    try {
      const { data, error } = await supabase.functions.invoke('social-auth-initiate', {
        body: { platform: platformId }
      });

      if (error) throw error;

      const { oauthUrl, stateData } = data;

      // Store state data for CSRF protection
      sessionStorage.setItem('oauth_state', JSON.stringify(stateData));

      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        oauthUrl,
        `${platformId}_oauth`,
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Listen for OAuth callback
      const handleMessage = async (event: MessageEvent) => {
        if (event.data.type === 'oauth_callback') {
          const { code, state } = event.data;
          const storedState = JSON.parse(sessionStorage.getItem('oauth_state') || '{}');

          if (state !== storedState.state) {
            toast.error('Security verification failed. Please try again.');
            return;
          }

          // Exchange code for token
          const { error: callbackError } = await supabase.functions.invoke('social-auth-callback', {
            body: { code, state, platform: platformId }
          });

          if (callbackError) {
            toast.error(`Failed to connect ${platformId}: ${callbackError.message}`);
          } else {
            toast.success(`Successfully connected ${platformId}!`);
            onAccountConnected();
            onOpenChange(false);
          }

          sessionStorage.removeItem('oauth_state');
          window.removeEventListener('message', handleMessage);
          popup?.close();
        }
      };

      window.addEventListener('message', handleMessage);

      // Check if popup was blocked
      if (!popup || popup.closed) {
        toast.error('Popup blocked. Please allow popups for this site.');
      }

    } catch (error: any) {
      console.error('OAuth initiation error:', error);
      toast.error(error.message || 'Failed to initiate connection');
    } finally {
      setConnecting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Social Account</DialogTitle>
          <DialogDescription>
            Choose a platform to connect your account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {platforms.map((platform) => {
            const Icon = platform.icon;
            const isConnecting = connecting === platform.id;

            return (
              <Button
                key={platform.id}
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-4"
                onClick={() => handleConnect(platform.id)}
                disabled={isConnecting}
              >
                <div className={`p-2 rounded-lg ${platform.color}`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold">{platform.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {platform.description}
                  </div>
                </div>
                {isConnecting && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                )}
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
