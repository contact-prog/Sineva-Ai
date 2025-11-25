import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Info, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useConnectedIntegrations } from '@/hooks/useConnectedIntegrations';

export function CalendarIntegrationInfo() {
  const navigate = useNavigate();
  const { integrations } = useConnectedIntegrations();
  
  const connectedCount = integrations.filter(i => i.connected).length;

  if (connectedCount === 0) {
    return (
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Connect your social media accounts to start scheduling posts</span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/app/integrations')}
          >
            <Settings className="h-4 w-4 mr-2" />
            Connect Accounts
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
