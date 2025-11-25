import { useEffect, useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Plug, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Settings,
  Clock
} from 'lucide-react';
import { PlatformCard } from '@/components/integrations/PlatformCard';
import { TokenMonitor } from '@/components/integrations/TokenMonitor';
import { WordPressConnector } from '@/components/integrations/WordPressConnector';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

// Use social_accounts as the source of truth for connected platforms
// so this page stays in sync with the Social module
type Integration = Tables<'social_accounts'>;
type WordPressIntegration = Tables<'integrations'>;

const Integrations = () => {
  const { setCurrentService } = useChat();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [wordpressIntegrations, setWordPressIntegrations] = useState<WordPressIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    connected: 0,
    needsRepair: 0
  });

  useEffect(() => {
    setCurrentService('integrations');
    fetchIntegrations();
  }, [setCurrentService]);

  const fetchIntegrations = async () => {
    try {
      // Fetch social accounts
      const { data: socialData, error: socialError } = await supabase
        .from('social_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (socialError) throw socialError;

      const accounts = socialData || [];
      setIntegrations(accounts);

      // Fetch WordPress integrations
      const { data: wpData, error: wpError } = await supabase
        .from('integrations')
        .select('*')
        .eq('platform', 'wordpress')
        .order('created_at', { ascending: false });

      if (wpError) throw wpError;

      const wpIntegrations = wpData || [];
      setWordPressIntegrations(wpIntegrations);
      
      // Calculate stats
      const now = new Date();
      const socialConnected = accounts.filter((a) =>
        a.is_active && (!a.token_expires_at || new Date(a.token_expires_at) > now)
      ).length;
      const socialNeedsRepair = accounts.filter((a) =>
        !a.is_active || (a.token_expires_at && new Date(a.token_expires_at) <= now)
      ).length;

      const wpConnected = wpIntegrations.filter((w) => w.connected && !w.needs_repair).length;
      const wpNeedsRepair = wpIntegrations.filter((w) => !w.connected || w.needs_repair).length;
      
      const total = accounts.length + wpIntegrations.length;
      const connected = socialConnected + wpConnected;
      const needsRepair = socialNeedsRepair + wpNeedsRepair;
      
      setStats({ total, connected, needsRepair });
    } catch (error) {
      console.error('Error fetching integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIntegrationByPlatform = (platform: string) => {
    return integrations.find(i => i.platform === platform);
  };

  const platforms = ['facebook', 'instagram', 'twitter', 'linkedin'];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Integrations</h1>
        <p className="text-muted-foreground mt-1">
          Connect and manage your social media accounts
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Integrations</CardTitle>
            <Plug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {platforms.length} platforms available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.connected}</div>
            <p className="text-xs text-muted-foreground">
              Active connections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.needsRepair}</div>
            <p className="text-xs text-muted-foreground">
              Requiring repair
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="platforms" className="space-y-4">
        <TabsList>
          <TabsTrigger value="platforms">
            <Settings className="h-4 w-4 mr-2" />
            Platforms
          </TabsTrigger>
          <TabsTrigger value="monitoring">
            <Clock className="h-4 w-4 mr-2" />
            Token Monitoring
          </TabsTrigger>
        </TabsList>

        <TabsContent value="platforms" className="space-y-4">
          {stats.needsRepair > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-destructive font-medium mb-2">
                <AlertCircle className="h-5 w-5" />
                Action Required
              </div>
              <p className="text-sm text-muted-foreground">
                {stats.needsRepair} integration(s) need to be repaired. Test or refresh the connections below.
              </p>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {platforms.map(platform => (
              <PlatformCard
                key={platform}
                platform={platform}
                integration={getIntegrationByPlatform(platform)}
                onUpdate={fetchIntegrations}
              />
            ))}
            
            {/* WordPress Integration */}
            <WordPressConnector
              integration={wordpressIntegrations[0]}
              onUpdate={fetchIntegrations}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Integration Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span className="text-sm">OAuth 2.0 authentication</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span className="text-sm">Automatic token refresh</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span className="text-sm">Connection health monitoring</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span className="text-sm">Multi-account support</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span className="text-sm">One-click testing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span className="text-sm">Secure credential storage</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring">
          <TokenMonitor />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Integrations;
