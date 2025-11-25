import { useEffect, useState } from 'react';
import { OnboardingData } from '@/types/onboarding';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

interface StepFiveProps {
  data: OnboardingData;
  onComplete: () => void;
}

const loadingMessages = [
  'Analyzing your business profile...',
  'Generating marketing recommendations...',
  'Creating your Brand Kit...',
  'Almost done!',
];

export function StepFive({ data, onComplete }: StepFiveProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [currentMessage, setCurrentMessage] = useState(0);

  useEffect(() => {
    // Simulate AI analysis
    const messageInterval = setInterval(() => {
      setCurrentMessage(prev => {
        if (prev < loadingMessages.length - 1) return prev + 1;
        return prev;
      });
    }, 2000);

    const analysisTimeout = setTimeout(() => {
      setIsAnalyzing(false);
      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }, 7000);

    return () => {
      clearInterval(messageInterval);
      clearTimeout(analysisTimeout);
    };
  }, []);

  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles className="w-16 h-16 text-primary" />
        </motion.div>
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-bold">Creating Your Marketing Strategy</h3>
          <motion.p
            key={currentMessage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-muted-foreground"
          >
            {loadingMessages[currentMessage]}
          </motion.p>
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-primary"
              animate={{ scale: currentMessage >= i ? 1 : 0.5, opacity: currentMessage >= i ? 1 : 0.3 }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-8"
    >
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.6 }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4"
        >
          <CheckCircle2 className="w-10 h-10 text-primary" />
        </motion.div>
        <h2 className="text-4xl font-bold">Welcome to Sineva AI!</h2>
        <p className="text-lg text-muted-foreground">
          Your personalized marketing platform is ready
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* AI Recommendations */}
        <Card className="p-6 space-y-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Recommendations
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Recommended Content Types
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                  Social Media Posts
                </span>
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                  Blog Articles
                </span>
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                  Email Campaigns
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Best Platforms for {data.industry}
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-secondary/10 text-secondary rounded-full text-xs font-medium">
                  LinkedIn
                </span>
                <span className="px-3 py-1 bg-secondary/10 text-secondary rounded-full text-xs font-medium">
                  Instagram
                </span>
                <span className="px-3 py-1 bg-secondary/10 text-secondary rounded-full text-xs font-medium">
                  Facebook
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Suggested Posting Frequency
              </p>
              <p className="text-sm">3-5 posts per week for optimal engagement</p>
            </div>
          </div>
        </Card>

        {/* Brand Kit Preview */}
        <Card className="p-6 space-y-4">
          <h3 className="text-xl font-semibold">Your Brand Kit</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Brand Colors</p>
              <div className="flex gap-2">
                <div
                  className="w-12 h-12 rounded-lg border-2 border-background shadow-sm"
                  style={{ backgroundColor: data.primaryColor }}
                  title="Primary"
                />
                <div
                  className="w-12 h-12 rounded-lg border-2 border-background shadow-sm"
                  style={{ backgroundColor: data.secondaryColor }}
                  title="Secondary"
                />
                <div
                  className="w-12 h-12 rounded-lg border-2 border-background shadow-sm"
                  style={{ backgroundColor: data.accentColor }}
                  title="Accent"
                />
              </div>
            </div>
            {data.logoUrl && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Logo</p>
                <div className="w-32 h-20 border rounded-lg flex items-center justify-center bg-muted/30 p-2">
                  <img src={data.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                </div>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Brand Voice</p>
              <p className="text-sm capitalize">{data.brandVoice}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Tagline</p>
              <p className="text-sm italic">"{data.tagline}"</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Stats */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-3xl font-bold text-primary">{data.goals?.length || 0}</p>
            <p className="text-sm text-muted-foreground">Marketing Goals</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-primary">
              ${(data.monthlyBudget || 0).toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">Monthly Budget</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-primary">{data.currentChannels?.length || 0}</p>
            <p className="text-sm text-muted-foreground">Active Channels</p>
          </div>
        </div>
      </Card>

      <div className="flex flex-col items-center gap-4 pt-4">
        <Button size="lg" onClick={onComplete} className="px-12">
          Go to Dashboard
        </Button>
        <p className="text-sm text-muted-foreground">
          Your brand kit and recommendations are ready to use
        </p>
      </div>
    </motion.div>
  );
}
