import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppTour } from '@/components/onboarding/AppTour';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function WelcomeTour() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState<string>();

  useEffect(() => {
    loadUserProfile();
    triggerSampleGeneration();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_name, app_tour_completed')
        .eq('id', user.id)
        .single();

      if (profile?.app_tour_completed) {
        // Already completed, go to chat
        navigate('/app/chat');
        return;
      }

      setCompanyName(profile?.company_name || undefined);
      setLoading(false);
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
      navigate('/app/chat');
    }
  };

  const triggerSampleGeneration = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Call edge function to generate samples in background
      supabase.functions.invoke('generate-welcome-samples', {
        body: { userId: user.id }
      }).catch(err => {
        console.error('Sample generation error:', err);
        // Don't block the tour if sample generation fails
      });
    } catch (error) {
      console.error('Error triggering sample generation:', error);
    }
  };

  const handleComplete = async (destination: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Mark tour as completed
      await supabase
        .from('user_profiles')
        .update({ app_tour_completed: true })
        .eq('id', user.id);

      navigate(destination);
    } catch (error) {
      console.error('Error completing tour:', error);
      toast.error('Failed to save progress');
      navigate('/app/chat');
    }
  };

  const handleSkip = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('user_profiles')
        .update({ app_tour_completed: true })
        .eq('id', user.id);

      navigate('/app/chat');
    } catch (error) {
      console.error('Error skipping tour:', error);
      navigate('/app/chat');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppTour
      companyName={companyName}
      onComplete={handleComplete}
      onSkip={handleSkip}
    />
  );
}
