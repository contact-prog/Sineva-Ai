import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const QueueConnectionBadge = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());

  useEffect(() => {
    // Monitor Supabase connection status
    const checkConnection = async () => {
      try {
        const { error } = await supabase.from('posting_queue').select('id').limit(1);
        setIsConnected(!error);
        if (!error) setLastSync(new Date());
      } catch {
        setIsConnected(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30s

    return () => clearInterval(interval);
  }, []);

  return (
    <Badge 
      variant="outline" 
      className={`gap-1 ${
        isConnected 
          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700' 
          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700'
      }`}
    >
      {isConnected ? (
        <>
          <Wifi className="h-3 w-3" />
          Connected
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          Disconnected
        </>
      )}
    </Badge>
  );
};
