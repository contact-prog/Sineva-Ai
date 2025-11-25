import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export function TokenMonitor() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingAll, setRefreshingAll] = useState(false);

  useEffect(() => {
    fetchIntegrations();

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchIntegrations, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const fetchIntegrations = async () => {
    try {
      const { data, error } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('is_active', true)
        .order('token_expires_at', { ascending: true });

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error) {
      console.error('Error fetching integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshAll = async () => {
    setRefreshingAll(true);
    let successCount = 0;
    let failCount = 0;

    for (const integration of integrations) {
      if (!integration.refresh_token) continue;

      try {
        const { error } = await supabase.functions.invoke('social-refresh-token', {
          body: { integrationId: integration.id }
        });

        if (error) throw error;
        successCount++;
      } catch (error) {
        console.error(`Failed to refresh ${integration.platform}:`, error);
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Refreshed ${successCount} token(s)`);
    }
    if (failCount > 0) {
      toast.error(`Failed to refresh ${failCount} token(s)`);
    }

    await fetchIntegrations();
    setRefreshingAll(false);
  };

  const handleRefreshToken = async (integrationId: string) => {
    try {
      const { error } = await supabase.functions.invoke('social-refresh-token', {
        body: { integrationId }
      });

      if (error) throw error;

      toast.success('Token refreshed successfully');
      await fetchIntegrations();
    } catch (error: any) {
      console.error('Refresh error:', error);
      toast.error(`Failed to refresh token: ${error.message}`);
    }
  };

  const getTokenStatus = (expiresAt: string | null) => {
    if (!expiresAt) return { label: 'No Expiry', color: 'secondary', progress: 100 };

    const now = new Date();
    const expires = new Date(expiresAt);
    const totalTime = 60 * 24 * 60 * 60 * 1000; // 60 days in ms
    const timeLeft = expires.getTime() - now.getTime();
    const progress = (timeLeft / totalTime) * 100;

    if (timeLeft < 0) {
      return { label: 'Expired', color: 'destructive', progress: 0 };
    } else if (timeLeft < 7 * 24 * 60 * 60 * 1000) {
      return { label: 'Expiring Soon', color: 'destructive', progress };
    } else if (timeLeft < 14 * 24 * 60 * 60 * 1000) {
      return { label: 'Expiring', color: 'default', progress };
    } else {
      return { label: 'Active', color: 'default', progress };
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const expiringIntegrations = integrations.filter(i => {
    if (!i.token_expires_at) return false;
    const timeLeft = new Date(i.token_expires_at).getTime() - new Date().getTime();
    return timeLeft < 14 * 24 * 60 * 60 * 1000; // Less than 14 days
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Token Monitor
            </CardTitle>
            <CardDescription>
              Automatic token refresh and expiration monitoring
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={refreshingAll || integrations.length === 0}
          >
            {refreshingAll ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh All
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {expiringIntegrations.length > 0 && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2 text-destructive font-medium text-sm mb-2">
              <AlertTriangle className="h-4 w-4" />
              {expiringIntegrations.length} Token(s) Need Attention
            </div>
            <p className="text-xs text-muted-foreground">
              Some tokens are expiring soon or have expired. Refresh them to maintain connectivity.
            </p>
          </div>
        )}

        {integrations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto opacity-50 mb-3" />
            <p>No connected integrations to monitor</p>
          </div>
        ) : (
          <div className="space-y-3">
            {integrations.map(integration => {
              const status = getTokenStatus(integration.token_expires_at);
              const hasRefreshToken = !!integration.refresh_token;

              return (
                <div key={integration.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold capitalize flex items-center gap-2">
                        {integration.platform}
                        <Badge variant={status.color as any}>{status.label}</Badge>
                      </h4>
                      {integration.account_name && (
                        <p className="text-sm text-muted-foreground">
                          {integration.account_name}
                        </p>
                      )}
                    </div>
                    {hasRefreshToken && status.progress < 50 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRefreshToken(integration.id)}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                    )}
                  </div>

                  {integration.token_expires_at && (
                    <>
                      <Progress value={status.progress} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          Expires {formatDistanceToNow(new Date(integration.token_expires_at), { addSuffix: true })}
                        </span>
                        {!hasRefreshToken && (
                          <span className="text-destructive">Manual refresh required</span>
                        )}
                      </div>
                    </>
                  )}

                  {['Expired', 'Expiring', 'Expiring Soon'].includes(status.label) && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      Connection needs repair
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            Tokens are automatically refreshed when possible
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
