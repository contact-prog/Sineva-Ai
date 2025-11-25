import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export const useOnboardingGuard = () => {
  const [loading, setLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('onboarding_completed, app_tour_completed')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!profile?.onboarding_completed) {
        navigate('/magic-onboarding');
        return;
      }

      if (!profile?.app_tour_completed) {
        navigate('/welcome-tour');
        return;
      }

      setOnboardingComplete(true);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  };

  return { loading, onboardingComplete };
};
