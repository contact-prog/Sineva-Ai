import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { CalendarIcon, AlertCircle, ArrowLeft, Info, Upload, X, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useConnectedIntegrations } from '@/hooks/useConnectedIntegrations';
import { 
  getPlatformDisplayName,
  CALENDAR_PLATFORMS
} from '@/lib/social/platformValidation';
import { validateScheduling } from '@/lib/social/schedulingValidation';
import { getRemainingChars } from '@/lib/social/platformHelpers';
import { usePostingStore } from '@/stores/usePostingStore';

export default function EditPost() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  
  const [content, setContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<string[]>([]);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { integrations, loading: integrationsLoading } = useConnectedIntegrations();
  const { queueJobs } = usePostingStore();

  const connectedIntegrations = integrations.filter(
    int => int.connected && CALENDAR_PLATFORMS.includes(int.platform.toLowerCase())
  );

  // Load existing post data
  useEffect(() => {
    const loadPost = async () => {
      if (!id) {
        navigate('/app/calendar');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('posting_queue')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;
        
        if (!data) {
          toast.error('Post not found');
          navigate('/app/calendar');
          return;
        }

        setContent(data.content);
        setSelectedPlatforms(data.platforms);
        setScheduledDate(new Date(data.scheduled_for));
        setUploadedMedia(data.media_urls || []);
        setIsDraft(data.status === 'scheduled');
      } catch (error: any) {
        console.error('Error loading post:', error);
        toast.error('Failed to load post');
        navigate('/app/calendar');
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [id, navigate]);

  const getSchedulingValidation = () => {
    if (!scheduledDate) return null;
    
    const platforms = selectedPlatforms.length > 0 ? selectedPlatforms : [];
    
    const timeValidation = validateScheduling({
      scheduledDate,
      content,
      platforms: platforms,
      integrations: platforms.map(() => ({ connected: true, expiresAt: null })),
      existingJobs: queueJobs.filter(job => job.id !== id), // Exclude current post
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

  const handleUpdate = async () => {
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

    if (!id) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get current post to preserve integration_ids
      const { data: currentPost } = await supabase
        .from('posting_queue')
        .select('integration_ids')
        .eq('id', id)
        .single();

      // Update the post
      const { error } = await supabase
        .from('posting_queue')
        .update({
          content: content,
          platforms: selectedPlatforms as any[],
          media_urls: uploadedMedia,
          scheduled_for: scheduledDate.toISOString(),
          status: isDraft ? 'scheduled' : 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Post updated successfully!');
      navigate('/app/calendar');
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update post');
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

  if (loading) {
    return (
      <main className="container mx-auto py-8 px-4 max-w-5xl">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </main>
    );
  }

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
        <h1 className="text-3xl font-bold">Edit Post</h1>
        <p className="text-muted-foreground mt-2">
          Update your scheduled content
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="space-y-6">
            {/* Platform Selection */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Select Platforms</Label>
              {integrationsLoading ? (
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
                    {connectedIntegrations.map((integration) => (
                      <div key={integration.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={integration.platform}
                          checked={selectedPlatforms.includes(integration.platform)}
                          onCheckedChange={() => togglePlatform(integration.platform)}
                        />
                        <label
                          htmlFor={integration.platform}
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          {getPlatformDisplayName(integration.platform)}
                          {integration.accountName && (
                            <span className="text-muted-foreground ml-2">
                              ({integration.accountName})
                            </span>
                          )}
                        </label>
                      </div>
                    ))}
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
          onClick={handleUpdate}
          disabled={isSubmitting || selectedPlatforms.length === 0 || !scheduledDate}
        >
          {isSubmitting ? 'Updating...' : 'Update Post'}
        </Button>
      </div>
    </main>
  );
}
