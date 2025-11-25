import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { TimePicker } from '@/components/ui/time-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { CalendarIcon, AlertCircle, ArrowLeft, Info, Upload, X, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  getPlatformDisplayName,
  CALENDAR_PLATFORMS
} from '@/lib/social/platformValidation';
import { validateScheduling } from '@/lib/social/schedulingValidation';
import { getRemainingChars } from '@/lib/social/platformHelpers';
import { usePostingStore } from '@/stores/usePostingStore';
import type { Tables } from '@/integrations/supabase/types';

type SocialAccount = Tables<'social_accounts'>;

export default function CreatePost() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  
  const [content, setContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  
  const getInitialDate = () => {
    if (dateParam) {
      const date = new Date(dateParam);
      const now = new Date();
      const minDate = new Date(now.getTime() + 2 * 60 * 1000);
      
      if (date < minDate) {
        return minDate;
      }
      return date;
    }
    return undefined;
  };
  
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(getInitialDate());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<string[]>([]);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToQueue, queueJobs } = usePostingStore();

  // Fetch social accounts
  useEffect(() => {
    const fetchSocialAccounts = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('No user found - redirecting to login');
          toast.error('Please log in to create posts');
          navigate('/auth');
          setLoading(false);
          return;
        }

        console.log('Fetching social accounts for user:', user.id);

        const { data, error } = await supabase
          .from('social_accounts')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('platform');

        console.log('Social accounts query result:', { data, error });

        if (error) throw error;

        // Filter out expired accounts
        const activeAccounts = (data || []).filter(account => {
          if (!account.token_expires_at) return true;
          const isValid = new Date(account.token_expires_at) > new Date();
          console.log(`Account ${account.platform} expired:`, !isValid);
          return isValid;
        });

        console.log('Active accounts after filtering:', activeAccounts);
        setSocialAccounts(activeAccounts);
      } catch (error) {
        console.error('Error fetching social accounts:', error);
        toast.error('Failed to load social accounts');
      } finally {
        setLoading(false);
      }
    };

    fetchSocialAccounts();
  }, [navigate]);

  const connectedIntegrations = socialAccounts.filter(
    acc => CALENDAR_PLATFORMS.includes(acc.platform.toLowerCase())
  );

  const getSchedulingValidation = () => {
    if (!scheduledDate) return null;
    
    const platforms = selectedPlatforms.length > 0 ? selectedPlatforms : [];
    
    const timeValidation = validateScheduling({
      scheduledDate,
      content,
      platforms: platforms,
      integrations: platforms.map(() => ({ connected: true, expiresAt: null })),
      existingJobs: queueJobs,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
    
    return timeValidation;
  };

  const validation = getSchedulingValidation();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to upload files');
        return;
      }

      const uploadPromises = Array.from(files).map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { data, error } = await supabase.storage
          .from('user-uploads')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('user-uploads')
          .getPublicUrl(filePath);

        return publicUrl;
      });

      const urls = await Promise.all(uploadPromises);
      setUploadedMedia([...uploadedMedia, ...urls]);
      toast.success(`${urls.length} file(s) uploaded successfully`);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to upload media');
    }
  };

  const handleEnhanceContent = async () => {
    if (!content.trim()) {
      toast.error('Please enter some content first');
      return;
    }

    setIsEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhance-social-content', {
        body: { content, platforms: selectedPlatforms }
      });

      if (error) throw error;
      if (data?.enhanced_content) {
        setContent(data.enhanced_content);
        toast.success('Content enhanced!');
      }
    } catch (error) {
      console.error('Enhancement error:', error);
      toast.error('Failed to enhance content');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSchedule = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error('Please select at least one platform');
      return;
    }

    if (!content.trim() && uploadedMedia.length === 0) {
      toast.error('Please add content or media');
      return;
    }

    if (!scheduledDate) {
      toast.error('Please select a date and time');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Group accounts by platform to post to all accounts of selected platforms
      const platformAccounts = selectedPlatforms.map(platform => {
        const accounts = socialAccounts.filter(acc => acc.platform === platform);
        return { platform, accountIds: accounts.map(acc => acc.id) };
      }).filter(p => p.accountIds.length > 0);

      if (platformAccounts.length === 0) {
        toast.error('No active accounts found for selected platforms');
        return;
      }

      // Create one queue entry per platform with all account IDs for that platform
      for (const { platform, accountIds } of platformAccounts) {
        const { error } = await supabase
          .from('posting_queue')
          .insert({
            user_id: user.id,
            integration_ids: accountIds, // Multiple account IDs for this platform
            platforms: [platform as any],
            content: content,
            media_urls: uploadedMedia,
            scheduled_for: scheduledDate.toISOString(),
            priority: 'medium',
            status: 'scheduled',
            max_attempts: 3,
          });

        if (error) throw error;
      }

      toast.success('Post scheduled successfully!');
      navigate('/app/calendar');
    } catch (error) {
      console.error('Scheduling error:', error);
      toast.error('Failed to schedule post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  return (
    <main className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/app/calendar')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Calendar
        </Button>
        <h1 className="text-3xl font-bold">Create Post</h1>
        <p className="text-muted-foreground mt-2">
          Schedule your content across multiple platforms
        </p>
        
        <Alert className="mt-4">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Quick Rules:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1 text-sm">
              <li>Schedule at least <strong>2 minutes ahead</strong> of current time</li>
              <li>Check character limits: Twitter (280), LinkedIn (3000), others vary</li>
              <li>YouTube scheduling available in <strong>Social Posting</strong> section only</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="space-y-6">
            {/* Platform Selection */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Select Platforms</Label>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading platforms...</p>
              ) : connectedIntegrations.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No social media accounts connected. Connect your accounts in{' '}
                    <Button
                      variant="link"
                      className="p-0 h-auto"
                      onClick={() => navigate('/app/integrations')}
                    >
                      Integrations
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : (
                <ScrollArea className="h-[120px] pr-4">
                  <div className="space-y-2">
                    {/* Group by platform and show platform once with account count */}
                    {Array.from(new Set(connectedIntegrations.map(acc => acc.platform))).map((platform) => {
                      const accountsForPlatform = connectedIntegrations.filter(acc => acc.platform === platform);
                      return (
                        <div key={platform} className="flex items-center space-x-2">
                          <Checkbox
                            id={platform}
                            checked={selectedPlatforms.includes(platform)}
                            onCheckedChange={() => togglePlatform(platform)}
                          />
                          <label
                            htmlFor={platform}
                            className="text-sm font-medium leading-none cursor-pointer"
                          >
                            {getPlatformDisplayName(platform)}
                            <span className="text-muted-foreground ml-2">
                              ({accountsForPlatform.length} account{accountsForPlatform.length !== 1 ? 's' : ''})
                            </span>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Content */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="content" className="text-base font-semibold">Content</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEnhanceContent}
                  disabled={isEnhancing || !content.trim()}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isEnhancing ? 'Enhancing...' : 'Enhance with AI'}
                </Button>
              </div>
              <Textarea
                id="content"
                placeholder="What's on your mind?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[200px] resize-none"
              />
              <div className="flex justify-between items-center mt-2">
                <div className="flex gap-2 flex-wrap">
                  {selectedPlatforms.map(platform => {
                    const remaining = getRemainingChars(content, platform);
                    const isValid = remaining >= 0;
                    return (
                      <Badge
                        key={platform}
                        variant={isValid ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {getPlatformDisplayName(platform)}: {remaining}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Media Upload */}
            <div>
              <Label className="text-base font-semibold mb-2 block">Media</Label>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Media
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {uploadedMedia.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {uploadedMedia.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={url}
                          alt={`Upload ${idx + 1}`}
                          className="w-full h-20 object-cover rounded"
                        />
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setUploadedMedia(uploadedMedia.filter((_, i) => i !== idx))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Schedule */}
            <div>
              <Label className="text-base font-semibold mb-2 block">Schedule</Label>
              
              {validation && validation.errors.length > 0 && (
                <Alert variant="destructive" className="mb-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1">
                      {validation.errors.map((error, idx) => (
                        <li key={idx} className="text-sm">{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !scheduledDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? format(scheduledDate, "PPP 'at' p") : "Pick a date and time"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <ScrollArea className="max-h-[500px]">
                    <div className="p-3 space-y-3">
                      <Calendar
                        mode="single"
                        selected={scheduledDate}
                        onSelect={(date) => {
                          if (date) {
                            const now = new Date();
                            const newDate = scheduledDate ? new Date(scheduledDate) : new Date(now.getTime() + 2 * 60 * 1000);
                            
                            newDate.setFullYear(date.getFullYear());
                            newDate.setMonth(date.getMonth());
                            newDate.setDate(date.getDate());
                            
                            const minDate = new Date(now.getTime() + 2 * 60 * 1000);
                            if (newDate < minDate) {
                              setScheduledDate(minDate);
                            } else {
                              setScheduledDate(newDate);
                            }
                          } else {
                            setScheduledDate(undefined);
                          }
                        }}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const selectedDate = new Date(date);
                          selectedDate.setHours(0, 0, 0, 0);
                          return selectedDate < today;
                        }}
                        initialFocus
                      />
                      {scheduledDate && (
                        <div className="border-t pt-3">
                          <Label className="mb-2 block">Time</Label>
                          <TimePicker date={scheduledDate} setDate={setScheduledDate} />
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>

            {/* Draft Toggle */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="draft"
                checked={isDraft}
                onCheckedChange={(checked) => setIsDraft(checked as boolean)}
              />
              <label htmlFor="draft" className="text-sm font-medium cursor-pointer">
                Save as draft
              </label>
            </div>
          </div>
        </Card>

        {/* Preview */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Preview</h3>
          <ScrollArea className="h-[600px] pr-4">
            {selectedPlatforms.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Select a platform to see preview
              </div>
            ) : (
              <div className="space-y-4">
                {selectedPlatforms.map((platform) => (
                  <div key={platform} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge>{getPlatformDisplayName(platform)}</Badge>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm whitespace-pre-wrap">{content || 'Your content will appear here...'}</p>
                      {uploadedMedia.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                          {uploadedMedia.slice(0, 4).map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt={`Preview ${idx + 1}`}
                              className="w-full h-32 object-cover rounded"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-6">
        <Button
          variant="outline"
          onClick={() => navigate('/app/calendar')}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSchedule}
          disabled={isSubmitting || selectedPlatforms.length === 0 || !scheduledDate}
        >
          {isSubmitting ? 'Scheduling...' : isDraft ? 'Save Draft' : 'Schedule Post'}
        </Button>
      </div>
    </main>
  );
}
