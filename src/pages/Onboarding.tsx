import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingData, BusinessStage } from '@/types/onboarding';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { StepOne } from '@/components/onboarding/StepOne';
import { StepTwo } from '@/components/onboarding/StepTwo';
import { StepThree } from '@/components/onboarding/StepThree';
import { StepFour } from '@/components/onboarding/StepFour';
import { StepFive } from '@/components/onboarding/StepFive';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function Onboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<OnboardingData>>({
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
    accentColor: '#ec4899',
    goals: [],
    currentChannels: [],
    monthlyBudget: 5000,
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      setUserId(user.id);

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profile && !profile.onboarding_completed) {
        setFormData({
          businessStage: profile.business_stage as BusinessStage,
          companyName: profile.company_name || undefined,
          industry: profile.industry || undefined,
          description: profile.description || undefined,
          websiteUrl: profile.website_url || undefined,
          scrapedData: (profile.scraped_data as any) || undefined,
          primaryColor: profile.primary_color || '#6366f1',
          secondaryColor: profile.secondary_color || '#8b5cf6',
          accentColor: profile.accent_color || '#ec4899',
          logoUrl: profile.logo_url || undefined,
          brandVoice: profile.brand_voice || undefined,
          tagline: profile.tagline || undefined,
          goals: profile.goals || [],
          targetAudience: profile.target_audience || undefined,
          monthlyBudget: profile.monthly_budget || 5000,
          currentChannels: profile.current_channels || [],
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your profile data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (data: Partial<OnboardingData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSaveAndExit = async () => {
    if (!userId) return;
    
    setSaving(true);
    try {
      await supabase
        .from('user_profiles')
        .upsert({
          id: userId,
          business_stage: formData.businessStage,
          company_name: formData.companyName,
          industry: formData.industry,
          description: formData.description,
          website_url: formData.websiteUrl,
          scraped_data: formData.scrapedData as any,
          primary_color: formData.primaryColor,
          secondary_color: formData.secondaryColor,
          accent_color: formData.accentColor,
          logo_url: formData.logoUrl,
          brand_voice: formData.brandVoice,
          tagline: formData.tagline,
          goals: formData.goals,
          target_audience: formData.targetAudience,
          monthly_budget: formData.monthlyBudget,
          current_channels: formData.currentChannels,
          recommended_content_types: (formData as any).recommendedContentTypes,
          recommended_platforms: (formData as any).recommendedPlatforms,
          posting_frequency: (formData as any).postingFrequency as any,
          onboarding_completed: false,
        }, {
          onConflict: 'id',
        });

      toast({
        title: 'Progress Saved',
        description: 'You can continue your onboarding later',
      });
      navigate('/app/chat');
    } catch (error) {
      console.error('Error saving progress:', error);
      toast({
        title: 'Error',
        description: 'Failed to save your progress',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!userId) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: userId,
          business_stage: formData.businessStage,
          company_name: formData.companyName,
          industry: formData.industry,
          description: formData.description,
          website_url: formData.websiteUrl,
          scraped_data: formData.scrapedData as any,
          primary_color: formData.primaryColor,
          secondary_color: formData.secondaryColor,
          accent_color: formData.accentColor,
          logo_url: formData.logoUrl,
          brand_voice: formData.brandVoice,
          tagline: formData.tagline,
          goals: formData.goals,
          target_audience: formData.targetAudience,
          monthly_budget: formData.monthlyBudget,
          current_channels: formData.currentChannels,
          recommended_content_types: (formData as any).recommendedContentTypes,
          recommended_platforms: (formData as any).recommendedPlatforms,
          posting_frequency: (formData as any).postingFrequency as any,
          onboarding_completed: true,
        }, {
          onConflict: 'id',
        });

      if (error) {
        throw error;
      }

      // Verify the update succeeded before navigating
      const { data: verifyProfile, error: verifyError } = await supabase
        .from('user_profiles')
        .select('onboarding_completed')
        .eq('id', userId)
        .maybeSingle();

      if (verifyError) {
        console.error('Error verifying profile:', verifyError);
        throw new Error('Failed to verify onboarding status');
      }

      if (!verifyProfile?.onboarding_completed) {
        throw new Error('Failed to update onboarding status');
      }

      toast({
        title: 'Onboarding Complete!',
        description: 'Let\'s take a quick tour of your new AI assistant!',
      });
      
      // Navigate to welcome tour after successful verification
      navigate('/welcome-tour');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete onboarding. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!formData.businessStage;
      case 2:
        return !!(formData.companyName && formData.industry && formData.description);
      case 3:
        return !!(formData.primaryColor && formData.brandVoice && formData.tagline);
      case 4:
        return formData.goals && formData.goals.length > 0;
      case 5:
        return true;
      default:
        return false;
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <ProgressBar currentStep={currentStep} totalSteps={5} onStepClick={setCurrentStep} />
      
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          {currentStep > 1 && (
            <Button variant="ghost" onClick={handleBack} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          )}
          <div className="ml-auto">
            <Button variant="outline" onClick={handleSaveAndExit} className="gap-2" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save & Exit
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-lg p-8 border border-border">
          {currentStep === 1 && (
            <StepOne 
              value={formData.businessStage}
              onChange={(stage: BusinessStage) => updateFormData({ businessStage: stage })}
              onNext={handleNext}
            />
          )}
          
          {currentStep === 2 && (
            <StepTwo 
              data={formData}
              onChange={updateFormData}
              onNext={handleNext}
            />
          )}
          
          {currentStep === 3 && (
            <StepThree 
              data={formData}
              onChange={updateFormData}
              onNext={handleNext}
            />
          )}
          
          {currentStep === 4 && (
            <StepFour 
              data={formData}
              onChange={updateFormData}
              onNext={handleNext}
            />
          )}
          
          {currentStep === 5 && (
            <StepFive 
              data={formData as OnboardingData}
              onComplete={handleComplete}
            />
          )}

          {currentStep < 5 && currentStep > 1 && (
            <div className="mt-8 flex justify-end">
              <Button 
                onClick={handleNext}
                disabled={!canProceed()}
                size="lg"
                className="px-8"
              >
                Continue
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
