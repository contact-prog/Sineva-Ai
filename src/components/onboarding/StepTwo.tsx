import { useState } from 'react';
import { OnboardingData, INDUSTRIES, ScrapedData } from '@/types/onboarding';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, Globe, Upload, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { AIEnhancerModal } from './AIEnhancerModal';
import { ScrapedDataReview } from './ScrapedDataReview';
import { ScrapingProgress } from './ScrapingProgress';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface StepTwoProps {
  data: Partial<OnboardingData>;
  onChange: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
}

export function StepTwo({ data, onChange, onNext }: StepTwoProps) {
  const { toast } = useToast();
  const [isScraping, setIsScraping] = useState(false);
  const [scrapingJobId, setScrapingJobId] = useState<string | null>(null);
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(data.scrapedData || null);
  const [showEnhancer, setShowEnhancer] = useState(false);
  const [industrySearch, setIndustrySearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [scrapingComplete, setScrapingComplete] = useState(false);
  const [showProgress, setShowProgress] = useState(false);

  const showWebsiteInput = data.businessStage === 'already_running';
  const hasScrapedData = !!scrapedData;

  const handleScrapeWebsite = async () => {
    if (!data.websiteUrl) {
      toast({
        title: 'Website URL Required',
        description: 'Please enter your website URL to analyze it',
        variant: 'destructive',
      });
      return;
    }

    // Normalize URL
    let normalizedUrl = data.websiteUrl.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    // Clear ALL previous state completely
    onChange({ 
      websiteUrl: normalizedUrl,
      companyName: '',
      description: '',
      industry: '',
      primaryColor: '',
      secondaryColor: '',
      accentColor: '',
      logoUrl: undefined,
      tagline: '',
      scrapedData: undefined
    });
    
    setIsScraping(true);
    setScrapingJobId(null);
    setScrapedData(null);
    setScrapingComplete(false);
    setShowProgress(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || '00000000-0000-0000-0000-000000000000';

      const { data: result, error } = await supabase.functions.invoke('scrape-website', {
        body: { 
          url: normalizedUrl,
          userId: userId,
          bustCache: Date.now() // Force fresh scrape
        },
      });

      if (error) {
        console.error('Scraping invocation error:', error);
        throw new Error(error.message || 'Failed to start website analysis');
      }

      if (result.success && result.jobId) {
        setScrapingJobId(result.jobId);
        console.log('Started NEW scraping job:', result.jobId);
      } else {
        throw new Error(result.error || 'Failed to start website analysis');
      }
    } catch (error) {
      console.error('Scraping error:', error);
      setIsScraping(false);
      toast({
        title: 'Analysis Failed',
        description: error instanceof Error ? error.message : 'Failed to analyze website. Please check the URL and try again.',
        variant: 'destructive',
      });
    }
  };

  const handleScrapingComplete = async (scraped: ScrapedData) => {
    console.log('Scraping completed with data:', scraped);

    // If nothing useful was extracted, treat as a graceful failure
    const hasUsefulData = Boolean(
      scraped?.companyName ||
      scraped?.description ||
      scraped?.industry ||
      scraped?.brandIntelligence ||
      scraped?.colors?.primary ||
      scraped?.logoUrl ||
      (scraped?.services && scraped.services.length > 0) ||
      scraped?.screenshots?.desktop ||
      scraped?.screenshots?.mobile
    );

    if (!hasUsefulData) {
      console.warn('Scraping completed but no useful data found');
      setIsScraping(false);
      setScrapingJobId(null);
      setScrapingComplete(false);
      setScrapedData(null);

      toast({
        title: 'No Data Found',
        description:
          'We could not extract any useful information from that website. Please check the URL or enter details manually.',
        variant: 'destructive',
      });
      return;
    }

    setScrapedData(scraped);
    setIsScraping(false);
    setScrapingComplete(true);
    // Keep showProgress true - let user dismiss it

    // Analyze industry if we have content
    if (scraped.description || scraped.rawContent) {
      try {
        const { data: industryResult, error: industryError } = await supabase.functions.invoke('analyze-industry', {
          body: { 
            description: scraped.description || '',
            websiteContent: scraped.rawContent || ''
          },
        });

        if (!industryError && industryResult?.success) {
          scraped.suggestedIndustry = industryResult.industry;
          scraped.confidence = industryResult.confidence;
        }
      } catch (err) {
        console.error('Industry analysis error:', err);
        // Don't show error to user, industry suggestion is optional
      }
    }

    // Pre-fill form with scraped data
    onChange({
      companyName: scraped.companyName || data.companyName,
      description: scraped.description || data.description,
      industry: scraped.suggestedIndustry || scraped.industry || data.industry,
      primaryColor: scraped.colors?.primary || data.primaryColor,
      secondaryColor: scraped.colors?.secondary || data.secondaryColor,
      accentColor: scraped.colors?.accent || data.accentColor,
      logoUrl: scraped.logoUrl || data.logoUrl,
      tagline: scraped.tagline || data.tagline,
      scrapedData: scraped,
    });

    toast({
      title: 'Analysis Complete! 🎉',
      description: 'We extracted data from your website. Review it below and make any edits you like.',
    });
  };

  const handleScrapingError = (error: string) => {
    console.error('Scraping failed:', error);
    setIsScraping(false);
    setScrapingComplete(false);
    // Keep showProgress true to show error state
    
    // Show user-friendly error message
    const friendlyMessage = error.includes('FIRECRAWL_API_KEY') 
      ? 'Website analysis service is not configured. Please contact support.'
      : error.includes('timeout')
      ? 'The analysis took too long. Please try again with a simpler website.'
      : error.includes('404') || error.includes('not found')
      ? 'We couldn\'t access that website. Please check the URL.'
      : 'We encountered an issue analyzing your website. Please try again or enter details manually.';

    toast({
      title: 'Analysis Issue',
      description: friendlyMessage,
      variant: 'destructive',
    });
  };

  const handleRetry = () => {
    setScrapingComplete(false);
    setShowProgress(true);
    handleScrapeWebsite();
  };
  
  const handleDismissProgress = () => {
    setShowProgress(false);
    setScrapingJobId(null);
  };

  const handleAcceptScrapedData = () => {
    toast({
      title: 'Data Applied ✓',
      description: 'You can still edit any field before continuing to the next step',
    });
  };

  const handleRescrape = () => {
    setScrapedData(null);
    setScrapingComplete(false);
    setShowProgress(true);
    onChange({ scrapedData: undefined });
    handleScrapeWebsite();
  };

  const filteredIndustries = INDUSTRIES.filter(ind =>
    ind.toLowerCase().includes(industrySearch.toLowerCase())
  );

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please upload an image smaller than 2MB',
        variant: 'destructive',
      });
      return;
    }

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a PNG, JPG, WebP, or SVG file',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      onChange({ logoUrl: publicUrl });

      toast({
        title: 'Logo Uploaded Successfully',
        description: 'Your logo has been saved',
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload logo. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Business Basics</h2>
        <p className="text-muted-foreground">
          {showWebsiteInput 
            ? 'Let AI analyze your website or enter details manually'
            : 'Tell us about your business'
          }
        </p>
      </div>

      <div className="space-y-6">
        {/* Website Analysis Section */}
        {showWebsiteInput && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="website" className="text-base font-semibold">Website Analysis (Optional)</Label>
              <p className="text-sm text-muted-foreground">
                Enter your website URL and we'll automatically extract your brand information
              </p>
              <div className="flex gap-2">
                <Input
                  id="website"
                  type="url"
                  placeholder="https://example.com"
                  value={data.websiteUrl || ''}
                  onChange={(e) => onChange({ websiteUrl: e.target.value })}
                  disabled={isScraping}
                  className="flex-1"
                />
                <Button
                  onClick={handleScrapeWebsite}
                  disabled={isScraping || !data.websiteUrl}
                  className="gap-2 shrink-0"
                  size="lg"
                >
                  {isScraping ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4" />
                      Analyze Website
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Scraping Progress */}
            {showProgress && (
              <>
                {!scrapingJobId ? (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-primary/5 border border-primary/20 rounded-lg p-6 space-y-4"
                  >
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <div className="flex-1">
                        <p className="font-medium">Starting analysis...</p>
                        <p className="text-sm text-muted-foreground">Connecting to website scraping service</p>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <ScrapingProgress
                    jobId={scrapingJobId}
                    onComplete={handleScrapingComplete}
                    onError={handleScrapingError}
                    onRetry={handleRetry}
                    onDismiss={handleDismissProgress}
                  />
                )}
              </>
            )}

            {/* Success Alert */}
            {scrapingComplete && hasScrapedData && (
              <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  Website analysis complete! Review the extracted data below and make any necessary edits.
                </AlertDescription>
              </Alert>
            )}

            {/* Scraped Data Review */}
            {hasScrapedData && (
              <ScrapedDataReview
                scrapedData={scrapedData}
                formData={data}
                onAccept={handleAcceptScrapedData}
                onRescrape={handleRescrape}
                onChange={onChange}
              />
            )}

            {!hasScrapedData && !isScraping && (
              <div className="text-center py-6 border-t">
                <p className="text-sm text-muted-foreground">
                  Or enter your business details manually below
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Manual Entry Fields */}
        <AnimatePresence mode="wait">
          {(!showWebsiteInput || !hasScrapedData || scrapingComplete) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  placeholder="Your Company Name"
                  value={data.companyName || ''}
                  onChange={(e) => onChange({ companyName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry *</Label>
                <Select
                  value={data.industry}
                  onValueChange={(value) => onChange({ industry: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1.5">
                      <Input
                        placeholder="Search industries..."
                        value={industrySearch}
                        onChange={(e) => setIndustrySearch(e.target.value)}
                        className="h-8"
                      />
                    </div>
                    {filteredIndustries.map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {data.scrapedData?.suggestedIndustry && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    AI suggested: {data.scrapedData.suggestedIndustry}
                    {data.scrapedData.confidence && ` (${Math.round(data.scrapedData.confidence * 100)}% confident)`}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Business Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what your business does..."
                  value={data.description || ''}
                  onChange={(e) => onChange({ description: e.target.value })}
                  rows={4}
                  maxLength={500}
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    {data.description?.length || 0}/500 characters
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowEnhancer(true)}
                    disabled={!data.description || data.description.length < 20}
                    className="gap-2"
                  >
                    <Sparkles className="w-3 h-3" />
                    Enhance with AI
                  </Button>
                </div>
              </div>

              {/* Logo Upload Section */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Company Logo</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors bg-muted/30">
                  {uploading ? (
                    <div className="space-y-3">
                      <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin" />
                      <p className="text-sm text-muted-foreground">Uploading logo...</p>
                    </div>
                  ) : data.logoUrl ? (
                    <div className="space-y-4">
                      <img
                        src={data.logoUrl}
                        alt="Logo preview"
                        className="max-w-[150px] max-h-[80px] mx-auto object-contain"
                      />
                      {scrapedData?.logoUrl === data.logoUrl && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center">
                          <Sparkles className="w-3 h-3" />
                          Extracted from your website
                        </p>
                      )}
                      <div className="flex gap-2 justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('logo-upload')?.click()}
                          disabled={uploading}
                        >
                          Change Logo
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onChange({ logoUrl: undefined })}
                          disabled={uploading}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">Upload your company logo</p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG, WebP, or SVG (Max 2MB)
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('logo-upload')?.click()}
                        disabled={uploading}
                      >
                        Choose File
                      </Button>
                    </div>
                  )}
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="sr-only"
                    onChange={handleLogoUpload}
                    disabled={uploading}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AIEnhancerModal
        open={showEnhancer}
        onClose={() => setShowEnhancer(false)}
        originalDescription={data.description || ''}
        companyContext={`${data.companyName} - ${data.industry}`}
        onSelect={(enhanced) => {
          onChange({ description: enhanced });
          setShowEnhancer(false);
        }}
      />
    </div>
  );
}
