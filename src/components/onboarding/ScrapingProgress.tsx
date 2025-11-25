import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ScrapingProgressProps {
  jobId: string;
  onComplete: (data: any) => void;
  onError: (error: string) => void;
  onRetry: () => void;
  onDismiss?: () => void;
}

interface JobStatus {
  status: string;
  progress_percentage: number;
  current_step: string;
  results: any;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
}

export function ScrapingProgress({ jobId, onComplete, onError, onRetry, onDismiss }: ScrapingProgressProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('Starting...');
  const [status, setStatus] = useState('processing');
  const [retryCount, setRetryCount] = useState(0);
  const [maxRetries, setMaxRetries] = useState(3);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const [startTime] = useState(Date.now());
  const [detailedSteps, setDetailedSteps] = useState<string[]>([]);
  const [scrapedInfo, setScrapedInfo] = useState<{
    logoFound?: boolean;
    colorsExtracted?: number;
    pagesScanned?: number;
    screenshotsTaken?: number;
  }>({});
  const hasCompletedRef = useRef(false);
  const lastJobIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Reset state when jobId changes (new scrape started)
    if (lastJobIdRef.current !== jobId) {
      console.log('New job started, resetting state. Old:', lastJobIdRef.current, 'New:', jobId);
      hasCompletedRef.current = false;
      setProgress(0);
      setCurrentStep('Starting...');
      setStatus('processing');
      setRetryCount(0);
      setErrorMessage(null);
      lastJobIdRef.current = jobId;
    }

    console.log('Setting up realtime subscription for job:', jobId);

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`scraping-job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'scraping_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          console.log('Received update for job', jobId, ':', payload);
          const job = payload.new as JobStatus;
          
          const newProgress = job.progress_percentage || 0;
          setProgress(newProgress);
          const stepText = job.current_step || '';
          setCurrentStep(stepText);
          setStatus(job.status);
          setRetryCount(job.retry_count || 0);
          setMaxRetries(job.max_retries || 3);
          setErrorMessage(job.error_message);
          
          // Add detailed step to history
          if (stepText && !detailedSteps.includes(stepText)) {
            setDetailedSteps(prev => [...prev, stepText]);
          }
          
          // Extract scraped info from results if available
          if (job.results) {
            const results = job.results;
            setScrapedInfo({
              logoFound: !!results.logoUrl,
              colorsExtracted: results.colors ? Object.keys(results.colors).length : 0,
              pagesScanned: results.totalPages || 1,
              screenshotsTaken: results.screenshots ? Object.keys(results.screenshots).length : 0,
            });
          }
          
          // Calculate estimated time remaining
          if (newProgress > 0 && newProgress < 100) {
            const elapsed = Date.now() - startTime;
            const estimatedTotal = (elapsed / newProgress) * 100;
            const remaining = Math.max(0, Math.ceil((estimatedTotal - elapsed) / 1000));
            setEstimatedTimeRemaining(remaining);
          }

          if (job.status === 'completed' && job.results && !hasCompletedRef.current) {
            console.log('Job completed with results, triggering onComplete');
            hasCompletedRef.current = true;
            onComplete(job.results);
          }

          if (job.status === 'failed') {
            console.error('Job failed:', job.error_message);
            setErrorMessage(job.error_message || 'Website analysis failed');
            
            // Only call onError if we've exhausted all retries
            if ((job.retry_count || 0) >= (job.max_retries || 3)) {
              onError(job.error_message || 'Failed after multiple attempts');
            }
          }
        }
      )
      .subscribe((subscribeStatus) => {
        console.log('Subscription status:', subscribeStatus);
      });

    // Initial fetch in case we missed updates
    const fetchInitialStatus = async () => {
      const { data, error } = await supabase
        .from('scraping_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        console.error('Error fetching initial job status:', error);
        return;
      }

      if (data) {
        const job = data as JobStatus;
        const newProgress = job.progress_percentage || 0;
        setProgress(newProgress);
        setCurrentStep(job.current_step || '');
        setStatus(job.status);
        setRetryCount(job.retry_count || 0);
        setMaxRetries(job.max_retries || 3);
        setErrorMessage(job.error_message);
        
        // Calculate estimated time remaining
        if (newProgress > 0 && newProgress < 100) {
          const elapsed = Date.now() - startTime;
          const estimatedTotal = (elapsed / newProgress) * 100;
          const remaining = Math.max(0, Math.ceil((estimatedTotal - elapsed) / 1000));
          setEstimatedTimeRemaining(remaining);
        }

        if (job.status === 'completed' && job.results && !hasCompletedRef.current) {
          console.log('Initial job data completed with results, triggering onComplete');
          hasCompletedRef.current = true;
          onComplete(job.results);
        }

        if (job.status === 'failed') {
          setErrorMessage(job.error_message || 'Website analysis failed');
          if ((job.retry_count || 0) >= (job.max_retries || 3)) {
            onError(job.error_message || 'Failed after multiple attempts');
          }
        }
      }
    };

    fetchInitialStatus();

    // Poll for status updates as backup (in case realtime fails)
    const pollInterval = setInterval(async () => {
      const { data } = await supabase
        .from('scraping_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (data) {
        const job = data as JobStatus;
        
        // Only update if status changed to avoid unnecessary re-renders
        if (job.status !== status || job.progress_percentage !== progress) {
          setProgress(job.progress_percentage || 0);
          setCurrentStep(job.current_step || '');
          setStatus(job.status);
          setRetryCount(job.retry_count || 0);
          setErrorMessage(job.error_message);

          if (job.status === 'completed' && job.results && !hasCompletedRef.current) {
            hasCompletedRef.current = true;
            onComplete(job.results);
          }

          if (job.status === 'failed' && (job.retry_count || 0) >= (job.max_retries || 3)) {
            clearInterval(pollInterval);
            onError(job.error_message || 'Failed after multiple attempts');
          }

          if (job.status === 'completed') {
            clearInterval(pollInterval);
          }
        }
      }
    }, 3000); // Poll every 3 seconds

    return () => {
      console.log('Cleaning up subscription for job:', jobId);
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [jobId, onComplete, onError]);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <Card className="p-6 space-y-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <AnimatePresence mode="wait">
        {status === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-lg">Analyzing Your Website</h3>
                  {estimatedTimeRemaining !== null && estimatedTimeRemaining > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ~{formatTime(estimatedTimeRemaining)} remaining
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{currentStep}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">{progress}%</p>
                <p className="text-xs text-muted-foreground">
                  This usually takes 30-60 seconds
                </p>
              </div>
            </div>

            {/* Scraped Information Cards */}
            {Object.keys(scrapedInfo).length > 0 && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {scrapedInfo.logoFound && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-primary/10 border border-primary/20 rounded p-2 text-center"
                  >
                    <CheckCircle2 className="w-4 h-4 text-primary mx-auto mb-1" />
                    <div className="font-medium text-primary">Logo Found</div>
                  </motion.div>
                )}
                {scrapedInfo.colorsExtracted && scrapedInfo.colorsExtracted > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-primary/10 border border-primary/20 rounded p-2 text-center"
                  >
                    <CheckCircle2 className="w-4 h-4 text-primary mx-auto mb-1" />
                    <div className="font-medium text-primary">{scrapedInfo.colorsExtracted} Colors</div>
                  </motion.div>
                )}
                {scrapedInfo.pagesScanned && scrapedInfo.pagesScanned > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-primary/10 border border-primary/20 rounded p-2 text-center"
                  >
                    <CheckCircle2 className="w-4 h-4 text-primary mx-auto mb-1" />
                    <div className="font-medium text-primary">{scrapedInfo.pagesScanned} Pages</div>
                  </motion.div>
                )}
                {scrapedInfo.screenshotsTaken && scrapedInfo.screenshotsTaken > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-primary/10 border border-primary/20 rounded p-2 text-center"
                  >
                    <CheckCircle2 className="w-4 h-4 text-primary mx-auto mb-1" />
                    <div className="font-medium text-primary">{scrapedInfo.screenshotsTaken} Screenshots</div>
                  </motion.div>
                )}
              </div>
            )}

            {/* Detailed Steps History */}
            {detailedSteps.length > 0 && (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                <p className="text-xs font-medium text-muted-foreground mb-2">Recent Activity:</p>
                {detailedSteps.slice(-5).map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0" />
                    <span className="line-clamp-1">{step}</span>
                  </motion.div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-4 gap-2 text-xs">
              {[
                { label: 'Fetching', threshold: 10, desc: 'Loading website' },
                { label: 'Analyzing', threshold: 30, desc: 'Scanning pages' },
                { label: 'Extracting', threshold: 70, desc: 'Getting data' },
                { label: 'Complete', threshold: 100, desc: 'Finishing up' },
              ].map((step) => (
                <div
                  key={step.label}
                  className={`text-center p-2 rounded transition-all ${
                    progress >= step.threshold
                      ? 'bg-primary/20 text-primary font-medium'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <div className="font-medium">{step.label}</div>
                  {progress >= step.threshold && progress < step.threshold + 20 && (
                    <div className="text-[10px] mt-0.5 opacity-70">{step.desc}</div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {status === 'completed' && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-3 text-green-600">
              <CheckCircle2 className="w-6 h-6" />
              <div className="flex-1">
                <h3 className="font-semibold">Analysis Complete!</h3>
                <p className="text-sm text-muted-foreground">Your website data has been extracted successfully</p>
              </div>
            </div>
            {onDismiss && (
              <Button onClick={onDismiss} variant="outline" className="w-full" size="sm">
                Dismiss
              </Button>
            )}
          </motion.div>
        )}

        {status === 'failed' && (
          <motion.div
            key="failed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3 text-destructive">
              <XCircle className="w-6 h-6" />
              <div className="flex-1">
                <h3 className="font-semibold">Analysis Failed</h3>
                <p className="text-sm text-muted-foreground">
                  {errorMessage || "We couldn't analyze your website automatically"}
                </p>
                {retryCount > 0 && retryCount < maxRetries && (
                  <p className="text-xs text-amber-600 mt-1">
                    Automatically retrying... (Attempt {retryCount + 1} of {maxRetries})
                  </p>
                )}
                {retryCount >= maxRetries && (
                  <p className="text-xs text-destructive mt-1">
                    Failed after {maxRetries} attempts. Please try again or enter details manually.
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={onRetry} variant="outline" className="flex-1 gap-2">
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              <Button 
                variant="ghost" 
                className="flex-1"
                onClick={() => {
                  // Let user skip and fill manually
                  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                }}
              >
                Enter Manually
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
