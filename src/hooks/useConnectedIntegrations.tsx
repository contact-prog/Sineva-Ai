import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ConnectedIntegration {
  id: string;
  platform: string;
  accountName?: string;
  accountId?: string;
  connected: boolean;
  lastSync?: Date;
  expiresAt?: string | null;
  metadata?: any;
}

export function useConnectedIntegrations() {
  const [integrations, setIntegrations] = useState<ConnectedIntegration[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIntegrations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIntegrations([]);
        return;
      }

      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const connectedIntegrations: ConnectedIntegration[] = (data || []).map((integration: any) => ({
        id: integration.id,
        platform: integration.platform,
        accountName: integration.metadata?.account_name || integration.account_name || undefined,
        accountId: integration.metadata?.account_id || integration.account_id || undefined,
        connected: !!integration.access_token,
        lastSync: integration.updated_at ? new Date(integration.updated_at) : undefined,
        expiresAt: integration.expires_at || null,
        metadata: integration.metadata || {},
      }));

      setIntegrations(connectedIntegrations);
    } catch (error) {
      console.error('Error fetching integrations:', error);
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();

    const channel = supabase
      .channel('integrations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'integrations',
        },
        () => {
          fetchIntegrations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isConnected = (platform: string): boolean => {
    return integrations.some(
      (int) => int.platform.toLowerCase() === platform.toLowerCase() && int.connected
    );
  };

  const getConnectedIntegration = (platform: string): ConnectedIntegration | undefined => {
    return integrations.find(
      (int) => int.platform.toLowerCase() === platform.toLowerCase() && int.connected
    );
  };

  const getConnectedPlatforms = (): string[] => {
    return integrations
      .filter((int) => int.connected)
      .map((int) => int.platform);
  };

  return {
    integrations,
    loading,
    isConnected,
    getConnectedIntegration,
    getConnectedPlatforms,
    refetch: fetchIntegrations,
  };
}
