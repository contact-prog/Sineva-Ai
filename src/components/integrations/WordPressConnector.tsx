import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AlertCircle, CheckCircle2, ExternalLink, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

interface WordPressConnectorProps {
  integration?: Tables<'integrations'>;
  onUpdate: () => void;
}

export function WordPressConnector({ integration, onUpdate }: WordPressConnectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [formData, setFormData] = useState({
    siteUrl: '',
    username: '',
    applicationPassword: '',
  });

  const handleConnect = async () => {
    if (!formData.siteUrl || !formData.username || !formData.applicationPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('wordpress-auth-initiate', {
        body: formData,
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message || 'WordPress connected successfully!');
        setIsOpen(false);
        setFormData({ siteUrl: '', username: '', applicationPassword: '' });
        onUpdate();
      } else {
        throw new Error(data.error || 'Failed to connect WordPress');
      }
    } catch (error) {
      console.error('WordPress connection error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to connect WordPress');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!integration?.id) return;

    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('wordpress-auth-callback', {
        body: { integrationId: integration.id },
      });

      if (error) throw error;

      if (data.success) {
        toast.success('WordPress connection is working!');
        onUpdate();
      } else {
        throw new Error(data.error || 'Connection test failed');
      }
    } catch (error) {
      console.error('WordPress test error:', error);
      toast.error(error instanceof Error ? error.message : 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!integration?.id) return;

    if (!confirm('Are you sure you want to disconnect this WordPress site?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('id', integration.id);

      if (error) throw error;

      toast.success('WordPress site disconnected');
      onUpdate();
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('Failed to disconnect WordPress site');
    }
  };

  const isConnected = integration?.connected && !integration?.needs_repair;
  const siteUrl = (integration?.metadata as { site_url?: string })?.site_url || '';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[#21759B] flex items-center justify-center text-white font-bold">
              W
            </div>
            <div>
              <CardTitle>WordPress</CardTitle>
              <CardDescription>Publish blogs to your WordPress site</CardDescription>
            </div>
          </div>
          {isConnected ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Connected
            </Badge>
          ) : integration ? (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              Needs Repair
            </Badge>
          ) : (
            <Badge variant="secondary">Not Connected</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {integration && (
          <div className="space-y-2 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Site:</span>
              <a
                href={siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1"
              >
                {siteUrl}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Account:</span>
              <span className="font-medium">{integration.account_name}</span>
            </div>
            {integration.last_tested_at && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Last Tested:</span>
                <span className="text-xs">
                  {new Date(integration.last_tested_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          {!integration ? (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button className="flex-1">Connect WordPress</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Connect WordPress Site</DialogTitle>
                  <DialogDescription>
                    Enter your WordPress site details and Application Password to connect.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="siteUrl">WordPress Site URL</Label>
                    <Input
                      id="siteUrl"
                      placeholder="https://yoursite.com"
                      value={formData.siteUrl}
                      onChange={(e) => setFormData({ ...formData, siteUrl: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Your WordPress site URL (e.g., https://yoursite.com)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">WordPress Username</Label>
                    <Input
                      id="username"
                      placeholder="admin"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="appPassword">Application Password</Label>
                    <Input
                      id="appPassword"
                      type="password"
                      placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                      value={formData.applicationPassword}
                      onChange={(e) =>
                        setFormData({ ...formData, applicationPassword: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Generate from: WP Admin → Users → Profile → Application Passwords
                    </p>
                  </div>

                  <div className="rounded-lg bg-muted p-3 space-y-2">
                    <p className="text-sm font-medium">How to get Application Password:</p>
                    <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Log into your WordPress admin dashboard</li>
                      <li>Go to Users → Profile</li>
                      <li>Scroll to "Application Passwords" section</li>
                      <li>Enter name (e.g., "Sineva AI") and click "Add New"</li>
                      <li>Copy the generated password and paste it above</li>
                    </ol>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    disabled={loading}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleConnect} disabled={loading} className="flex-1">
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      'Connect Site'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <>
              <Button variant="outline" onClick={handleTest} disabled={testing} className="flex-1">
                {testing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDisconnect}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {integration?.needs_repair && (
          <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
            ⚠️ Connection needs repair. Please test or reconnect.
          </div>
        )}
      </CardContent>
    </Card>
  );
}