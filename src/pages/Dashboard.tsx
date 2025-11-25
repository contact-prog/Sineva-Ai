import { useEffect, useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, TrendingUp, Calendar, Users, Wand2, Mail, MessageSquare, Share2 } from 'lucide-react';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { UsageMetrics } from '@/components/dashboard/UsageMetrics';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface DashboardAnalytics {
  graphics: { count: number; cost: number };
  emails: { sent: number; received: number };
  social: { scheduled: number; published: number; connectedAccounts: number };
  ai: { activeConversations: number };
  totalSpend: number;
}

const Dashboard = () => {
  const { setCurrentService } = useChat();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCurrentService('dashboard');
    loadAnalytics();
  }, [setCurrentService]);

  const loadAnalytics = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-dashboard-analytics');
      if (error) throw error;
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-card border border-border/30 rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-2">Welcome to Sineva AI</h1>
        <p className="text-muted-foreground">
          Your AI-powered marketing command center
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Graphics Created"
          value={analytics?.graphics.count || 0}
          subtitle={`$${analytics?.graphics.cost.toFixed(2) || '0.00'} spent`}
          icon={Wand2}
          loading={loading}
        />

        <DashboardCard
          title="Scheduled Posts"
          value={analytics?.social.scheduled || 0}
          subtitle={`${analytics?.social.published || 0} published`}
          icon={Calendar}
          loading={loading}
        />

        <DashboardCard
          title="Email Activity"
          value={analytics?.emails.sent || 0}
          subtitle={`${analytics?.emails.received || 0} received`}
          icon={Mail}
          loading={loading}
        />

        <DashboardCard
          title="AI Conversations"
          value={analytics?.ai.activeConversations || 0}
          subtitle="Last 30 days"
          icon={MessageSquare}
          loading={loading}
        />
      </div>

      <UsageMetrics />

      <Card className="border border-border/30">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              className="h-auto flex-col items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
              onClick={() => navigate('/app/graphics')}
            >
              <Wand2 className="h-5 w-5 text-primary" />
              <div className="text-center">
                <p className="font-medium text-sm">Create Graphic</p>
                <p className="text-xs text-muted-foreground">Design visuals</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
              onClick={() => navigate('/app/videos')}
            >
              <Sparkles className="h-5 w-5 text-primary" />
              <div className="text-center">
                <p className="font-medium text-sm">Make Video</p>
                <p className="text-xs text-muted-foreground">Generate videos</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
              onClick={() => navigate('/app/content')}
            >
              <Mail className="h-5 w-5 text-primary" />
              <div className="text-center">
                <p className="font-medium text-sm">Write Content</p>
                <p className="text-xs text-muted-foreground">Create posts</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
              onClick={() => navigate('/app/calendar')}
            >
              <Calendar className="h-5 w-5 text-primary" />
              <div className="text-center">
                <p className="font-medium text-sm">Schedule</p>
                <p className="text-xs text-muted-foreground">Plan content</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {analytics && analytics.social.connectedAccounts > 0 && (
        <Card className="border border-border/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              Connected Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{analytics.social.connectedAccounts}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Social media accounts connected
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
