import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, AlertTriangle, TrendingUp, Wand2, MessageSquare, FileText, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Subscription {
  plan_tier: string;
  status: string;
  graphics_limit: number;
  graphics_used: number;
  videos_limit: number;
  videos_used: number;
  chat_limit: number;
  chat_used: number;
  content_limit: number;
  content_used: number;
  email_limit: number;
  email_used: number;
  overage_credits: number;
  current_period_end: string;
  trial_ends_at: string | null;
}

export function UsageMetrics() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error loading subscription:', error);
        return;
      }

      setSubscription(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !subscription) {
    return null;
  }

  const getPercentage = (used: number, limit: number) => {
    return Math.min((used / limit) * 100, 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-destructive';
    if (percentage >= 75) return 'bg-warning';
    return 'bg-primary';
  };

  const isNearLimit = (used: number, limit: number) => {
    return used / limit >= 0.75;
  };

  const planNames: Record<string, string> = {
    starter: 'Starter',
    professional: 'Professional',
    business: 'Business',
    enterprise: 'Enterprise'
  };

  const planPrices: Record<string, string> = {
    starter: '$29/mo',
    professional: '$79/mo',
    business: '$199/mo',
    enterprise: 'Custom'
  };

  const metrics = [
    {
      label: 'Graphics',
      used: subscription.graphics_used,
      limit: subscription.graphics_limit,
      icon: Wand2
    },
    {
      label: 'Videos',
      used: subscription.videos_used,
      limit: subscription.videos_limit,
      icon: Sparkles
    },
    {
      label: 'AI Chat',
      used: subscription.chat_used,
      limit: subscription.chat_limit,
      icon: MessageSquare
    },
    {
      label: 'Content',
      used: subscription.content_used,
      limit: subscription.content_limit,
      icon: FileText
    },
    {
      label: 'Emails',
      used: subscription.email_used,
      limit: subscription.email_limit,
      icon: Mail
    }
  ];

  const daysUntilReset = Math.ceil(
    (new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const hasWarnings = metrics.some(m => isNearLimit(m.used, m.limit));

  return (
    <Card className="col-span-full border border-border/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Usage & Limits
            </CardTitle>
            <Badge variant={subscription.status === 'trialing' ? 'secondary' : 'default'}>
              {planNames[subscription.plan_tier]} {planPrices[subscription.plan_tier]}
            </Badge>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/pricing')}>
            Upgrade Plan
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {subscription.status === 'trialing' 
            ? `Trial ends in ${Math.ceil((new Date(subscription.trial_ends_at!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days`
            : `Resets in ${daysUntilReset} days`
          }
          {subscription.overage_credits > 0 && (
            <span className="ml-4 text-primary font-medium">
              <Sparkles className="h-3 w-3 inline mr-1" />
              {subscription.overage_credits} bonus credits
            </span>
          )}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {metrics.map((metric) => {
          const percentage = getPercentage(metric.used, metric.limit);
          const nearLimit = isNearLimit(metric.used, metric.limit);
          const Icon = metric.icon;

          return (
            <div key={metric.label} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{metric.label}</span>
                  {nearLimit && (
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  )}
                </span>
                <span className={nearLimit ? 'text-warning font-medium' : 'text-muted-foreground'}>
                  {metric.used.toLocaleString()} / {metric.limit.toLocaleString()}
                </span>
              </div>
              <Progress 
                value={percentage} 
                className="h-2"
              />
            </div>
          );
        })}

        {hasWarnings && (
          <div className="mt-4 p-3 bg-warning/10 border border-warning/30 rounded-lg">
            <p className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              You're approaching your monthly limits
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Consider upgrading your plan or purchasing additional credits to avoid interruptions.
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={() => navigate('/pricing')}>
                View Plans
              </Button>
              <Button size="sm" onClick={() => navigate('/pricing')}>
                Purchase Credits
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
