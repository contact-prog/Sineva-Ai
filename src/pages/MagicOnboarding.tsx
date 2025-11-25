import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Globe, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MagicReveal } from '@/components/onboarding/MagicReveal';
import { ScrapingProgress } from '@/components/onboarding/ScrapingProgress';
import { AIGenerationProgress } from '@/components/onboarding/AIGenerationProgress';
import type { ScrapedData } from '@/types/onboarding';

export default function MagicOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [stage, setStage] = useState<'entry' | 'scraping' | 'generating' | 'reveal'>('entry');
  const [scrapingJobId, setScrapingJobId] = useState<string | null>(null);
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);
  const [magicData, setMagicData] = useState<any>(null);
  const [showScrapingProgress, setShowScrapingProgress] = useState(false);
  const [isScraping, setIsScraping] = useState(false);

  const handleStartMagic = async () => {
    if (!websiteUrl.trim()) {
      toast({
        title: 'Website URL Required',
        description: 'Please enter your website URL to continue',
        variant: 'destructive',
      });
      return;
    }

    // Validate and normalize URL
    let normalizedUrl = websiteUrl.trim();
    try {
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = `https://${normalizedUrl}`;
      }
      new URL(normalizedUrl);
    } catch {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid website URL',
        variant: 'destructive',
      });
      return;
    }

    // Start scraping stage
    setStage('scraping');
    setScrapingJobId(null);
    setScrapedData(null);
    setShowScrapingProgress(true);
    setIsScraping(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Start website scraping
      const { data: scrapeResult, error: scrapeError } = await supabase.functions.invoke('scrape-website', {
        body: { 
          url: normalizedUrl,
          userId: user.id,
          bustCache: Date.now()
        },
      });

      if (scrapeError) {
        console.error('Scraping invocation error:', scrapeError);
        throw new Error(scrapeError.message || 'Failed to start website analysis');
      }

      if (scrapeResult.success && scrapeResult.jobId) {
        setScrapingJobId(scrapeResult.jobId);
        console.log('Started scraping job:', scrapeResult.jobId);
      } else {
        throw new Error(scrapeResult.error || 'Failed to start website analysis');
      }
    } catch (error) {
      console.error('Error starting magic onboarding:', error);
      toast({
        title: 'Failed to Start',
        description: error instanceof Error ? error.message : 'Could not start website analysis',
        variant: 'destructive',
      });
      setStage('entry');
    }
  };

  const handleScrapingComplete = async (scraped: ScrapedData) => {
    console.log('✅ Scraping completed. Full scraped data:', JSON.stringify(scraped, null, 2));
    console.log('📸 Screenshots available:', scraped?.screenshots);
    console.log('🧠 Brand Intelligence available:', scraped?.brandIntelligence);
    setScrapedData(scraped);
    setIsScraping(false);
    
    // Show completion state for 4 seconds before transitioning to build anticipation
    setTimeout(async () => {
      setShowScrapingProgress(false);
      setStage('generating');
      
      // Start AI content generation
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/auth');
          return;
        }

        // Call the magic onboarding edge function for AI generation
        const { data, error } = await supabase.functions.invoke('generate-onboarding-magic', {
          body: { 
            websiteUrl: websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`,
            userId: user.id,
            scrapedData: scraped // Pass scraped data
          }
        });

        if (error) {
          console.error('AI generation error:', error);
          throw new Error(error.message || 'Failed to generate AI content');
        }

        if (!data || !data.success) {
          throw new Error('Failed to generate content');
        }

        setMagicData(data);
        setStage('reveal');
      } catch (error) {
        console.error('AI generation error:', error);
        toast({
          title: 'Generation Error',
          description: 'We analyzed your website but couldn\'t generate AI content. You can still continue with the scraped data.',
          variant: 'destructive',
        });
        // Continue to reveal with partial data
        setMagicData({ brandKit: scraped });
        setStage('reveal');
      }
    }, 4000);
  };

  const handleScrapingError = (error: string) => {
    console.error('Scraping failed:', error);
    setIsScraping(false);
    
    const friendlyMessage = error.includes('FIRECRAWL_API_KEY') 
      ? 'Website analysis service is not configured. Please contact support.'
      : error.includes('timeout')
      ? 'The analysis took too long. Please try again or start manually.'
      : error.includes('404') || error.includes('not found')
      ? 'We couldn\'t access that website. Please check the URL.'
      : 'We encountered an issue analyzing your website. Please try again or start manually.';

    toast({
      title: 'Analysis Issue',
      description: friendlyMessage,
      variant: 'destructive',
    });
    
    setShowScrapingProgress(false);
    setStage('entry');
  };

  const handleRetry = () => {
    setScrapingJobId(null);
    setScrapedData(null);
    setShowScrapingProgress(false);
    handleStartMagic();
  };
  
  const handleDismissProgress = () => {
    setShowScrapingProgress(false);
    setStage('entry');
  };

  const handleAIGenerationComplete = () => {
    console.log('AI generation complete, moving to reveal');
    // The reveal stage is already set when AI generation completes
  };

  const handleContinueToTour = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Mark onboarding as completed
      await supabase
        .from('user_profiles')
        .update({ 
          onboarding_completed: true,
          onboarding_magic_completed: true 
        })
        .eq('id', user.id);

      navigate('/welcome-tour');
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to proceed. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Scraping stage
  if (stage === 'scraping' && showScrapingProgress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center px-4">
        <div className="w-full max-w-2xl space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <h2 className="text-3xl font-bold">Analyzing Your Website</h2>
            <p className="text-muted-foreground">
              We're extracting your brand information from your website
            </p>
          </motion.div>

          {isScraping && !scrapingJobId ? (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-lg p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <div className="flex-1">
                  <p className="font-medium">Starting analysis...</p>
                  <p className="text-sm text-muted-foreground">Connecting to website scraping service</p>
                </div>
              </div>
            </motion.div>
          ) : scrapingJobId ? (
            <ScrapingProgress
              jobId={scrapingJobId}
              onComplete={handleScrapingComplete}
              onError={handleScrapingError}
              onRetry={handleRetry}
              onDismiss={handleDismissProgress}
            />
          ) : null}
        </div>
      </div>
    );
  }

  // AI Generation stage
  if (stage === 'generating') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center px-4">
        <div className="w-full max-w-2xl space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <Sparkles className="w-16 h-16 mx-auto text-primary animate-pulse" />
            <h2 className="text-3xl font-bold">Creating Your AI Content</h2>
            <p className="text-muted-foreground">
              Generating personalized social posts, blog ideas, and marketing strategies
            </p>
          </motion.div>

          <AIGenerationProgress onComplete={handleAIGenerationComplete} />
        </div>
      </div>
    );
  }

  // Reveal stage
  if (stage === 'reveal' && magicData) {
    return (
      <MagicReveal 
        data={magicData}
        scrapedData={scrapedData}
        onContinue={handleContinueToTour}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 mx-auto"
          >
            <Sparkles className="w-10 h-10 text-primary-foreground" />
          </motion.div>

          <h1 className="text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
            Welcome to Sineva AI! ✨
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-xl mx-auto">
            To get started, we'll analyze your website and create your first AI-generated content in under 90 seconds.
          </p>
        </div>

        {/* Input Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-card border border-border rounded-2xl p-8 shadow-lg space-y-6"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              Enter your website URL
            </label>
            <Input
              type="text"
              placeholder="www.yourcompany.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleStartMagic()}
              className="h-14 text-lg"
              autoFocus
            />
          </div>

          <Button
            onClick={handleStartMagic}
            size="lg"
            className="w-full h-14 text-lg font-semibold"
          >
            Start the Magic →
          </Button>

          <div className="text-center">
            <button
              onClick={() => navigate('/onboarding')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Don't have a website? <span className="underline">Start manually instead</span>
            </button>
          </div>
        </motion.div>

        {/* Trust Badge */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-sm text-muted-foreground"
        >
          🔒 Your data is secure and will only be used to personalize your AI experience
        </motion.p>
      </motion.div>
    </div>
  );
}
