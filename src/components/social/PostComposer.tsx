import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Image, Video, X, Loader2, CheckCircle2, AlertCircle, Calendar as CalendarIcon, Clock, Sparkles, AlertTriangle } from 'lucide-react';
import { AccountSelector } from './AccountSelector';
import { ContentOptimizer } from './ContentOptimizer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { Tables } from '@/integrations/supabase/types';

type SocialAccount = Tables<'social_accounts'>;

interface PostComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostPublished: () => void;
}

interface PublishResult {
  platform: string;
  accountId: string;
  success: boolean;
  platformPostId?: string;
  error?: string;
}

export function PostComposer({ open, onOpenChange, onPostPublished }: PostComposerProps) {
  const [content, setContent] = useState('');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<SocialAccount[]>([]);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishResults, setPublishResults] = useState<PublishResult[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [scheduleDate, setScheduleDate] = useState<Date>();
  const [scheduleTime, setScheduleTime] = useState('12:00');
  const [isScheduled, setIsScheduled] = useState(false);
  const [showOptimizer, setShowOptimizer] = useState(false);
  const [activeTab, setActiveTab] = useState('compose');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Platform-specific character limits and media recommendations
  const platformLimits: Record<string, { text: number; images: number; videos: number; videoLength?: number }> = {
    twitter: { text: 280, images: 4, videos: 1, videoLength: 140 },
    facebook: { text: 63206, images: 10, videos: 1, videoLength: 240 },
    instagram: { text: 2200, images: 10, videos: 1, videoLength: 60 },
    linkedin: { text: 3000, images: 9, videos: 1, videoLength: 600 }
  };

  // Fetch selected accounts details
  useEffect(() => {
    if (selectedAccountIds.length > 0) {
      fetchSelectedAccounts();
    } else {
      setSelectedAccounts([]);
    }
  }, [selectedAccountIds]);

  const fetchSelectedAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('social_accounts')
        .select('*')
        .in('id', selectedAccountIds);

      if (error) throw error;
      setSelectedAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const getCharacterLimit = () => {
    if (selectedAccounts.length === 0) return 280;
    const limits = selectedAccounts.map(acc => platformLimits[acc.platform]?.text || 280);
    return Math.min(...limits);
  };

  const getMediaLimits = () => {
    if (selectedAccounts.length === 0) return { images: 4, videos: 1 };
    const imageLimits = selectedAccounts.map(acc => platformLimits[acc.platform]?.images || 4);
    const videoLimits = selectedAccounts.map(acc => platformLimits[acc.platform]?.videos || 1);
    return {
      images: Math.min(...imageLimits),
      videos: Math.min(...videoLimits)
    };
  };

  // Validate content for all platforms
  const validateContent = () => {
    const errors: Record<string, string> = {};
    
    if (!content.trim()) {
      errors.content = 'Content is required';
    }

    if (selectedAccountIds.length === 0) {
      errors.accounts = 'Select at least one account';
    }

    const charLimit = getCharacterLimit();
    if (content.length > charLimit) {
      errors.length = `Content exceeds ${charLimit} characters`;
    }

    const mediaLimits = getMediaLimits();
    const imageCount = mediaFiles.filter(f => f.type.startsWith('image/')).length;
    const videoCount = mediaFiles.filter(f => f.type.startsWith('video/')).length;

    if (imageCount > mediaLimits.images) {
      errors.images = `Too many images (max ${mediaLimits.images})`;
    }

    if (videoCount > mediaLimits.videos) {
      errors.videos = `Too many videos (max ${mediaLimits.videos})`;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  useEffect(() => {
    if (content || mediaFiles.length > 0) {
      validateContent();
    }
  }, [content, mediaFiles, selectedAccountIds]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setMediaFiles(prev => [...prev, ...files]);
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaUrls(prev => prev.filter((_, i) => i !== index));
  };

  const uploadMedia = async () => {
    if (mediaFiles.length === 0) return [];

    setUploading(true);
    setUploadProgress(0);
    const uploadedUrls: string[] = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      for (let i = 0; i < mediaFiles.length; i++) {
        const file = mediaFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('social-media')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('social-media')
          .getPublicUrl(data.path);

        uploadedUrls.push(publicUrl);
        setUploadProgress(((i + 1) / mediaFiles.length) * 100);
      }

      setMediaUrls(uploadedUrls);
      return uploadedUrls;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to upload media: ' + error.message);
      return [];
    } finally {
      setUploading(false);
    }
  };

  const handlePublish = async () => {
    if (!validateContent()) {
      toast.error('Please fix validation errors before publishing');
      return;
    }

    setPublishing(true);
    setPublishResults([]);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload media first if there are any files
      let uploadedMediaUrls = mediaUrls;
      if (mediaFiles.length > 0 && mediaUrls.length === 0) {
        uploadedMediaUrls = await uploadMedia();
        if (uploadedMediaUrls.length === 0 && mediaFiles.length > 0) {
          throw new Error('Failed to upload media');
        }
      }

      // Build scheduled datetime if scheduling
      let scheduledAt: string | undefined;
      if (isScheduled && scheduleDate) {
        const [hours, minutes] = scheduleTime.split(':');
        const scheduledDateTime = new Date(scheduleDate);
        scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0);
        
        // Get existing jobs for validation
        const { data: existingJobs } = await supabase
          .from('posting_queue')
          .select('scheduled_for, platforms')
          .eq('user_id', user.id)
          .gte('scheduled_for', new Date().toISOString());

        // Validate scheduling with enhanced validation
        const validation = await import('@/lib/social/schedulingValidation').then(m => 
          m.validateScheduling({
            scheduledDate: scheduledDateTime,
            content: content.trim(),
            platforms: selectedAccounts.map(a => a.platform),
            integrations: selectedAccounts.map(a => ({
              connected: a.is_active,
              expiresAt: a.token_expires_at
            })),
            existingJobs: existingJobs || [],
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          })
        );

        if (!validation.valid) {
          toast.error(validation.errors[0]);
          setPublishing(false);
          return;
        }

        if (validation.warnings.length > 0) {
          validation.warnings.forEach(warning => toast.warning(warning));
        }
        
        scheduledAt = scheduledDateTime.toISOString();
      }

      // If scheduling, save to posting_queue
      if (scheduledAt) {
        // Get platforms from selected accounts
        const platforms = [...new Set(selectedAccounts.map(a => a.platform))] as any[];
        
        const { error: queueError } = await supabase
          .from('posting_queue')
          .insert([{
            user_id: user.id,
            integration_ids: selectedAccountIds,
            platforms: platforms,
            content: content.trim(),
            media_urls: uploadedMediaUrls,
            scheduled_for: scheduledAt,
            status: 'scheduled' as const,
            priority: 'medium' as const,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          }]);

        if (queueError) throw queueError;

        toast.success(`Post scheduled for ${format(new Date(scheduledAt), 'PPp')}`);
        
        // Reset form
        setContent('');
        setSelectedAccountIds([]);
        setMediaFiles([]);
        setMediaUrls([]);
        setScheduleDate(undefined);
        setScheduleTime('12:00');
        setIsScheduled(false);
        onPostPublished();
        onOpenChange(false);
        return;
      }

      // Publish immediately using existing edge function
      const { data, error } = await supabase.functions.invoke('publish-social-post', {
        body: {
          accountIds: selectedAccountIds,
          content: content.trim(),
          mediaUrls: uploadedMediaUrls
        }
      });

      if (error) throw error;

      setPublishResults(data.results || []);

      if (data.success) {
        toast.success(`Successfully published to ${data.summary.successful} of ${data.summary.total} accounts`);
        
        // Reset form on full success
        if (data.summary.failed === 0) {
          setContent('');
          setSelectedAccountIds([]);
          setMediaFiles([]);
          setMediaUrls([]);
          onPostPublished();
          setTimeout(() => {
            onOpenChange(false);
            setPublishResults([]);
          }, 2000);
        }
      } else {
        toast.error('Failed to publish to all accounts');
      }

    } catch (error: any) {
      console.error('Publish error:', error);
      toast.error(error.message || 'Failed to publish post');
    } finally {
      setPublishing(false);
    }
  };

  const handleApplyOptimization = (optimization: any) => {
    if (optimization.hashtags) {
      // Apply hashtags to content
      const hashtags = optimization.hashtags.map((tag: string) => `#${tag}`).join(' ');
      setContent(prev => `${prev}\n\n${hashtags}`);
      toast.success('Hashtags added to content');
    } else if (optimization.platform && optimization.content) {
      // Apply adapted content
      setContent(optimization.content);
      toast.success(`Content adapted for ${optimization.platform}`);
    }
  };

  const characterCount = content.length;
  const maxLength = getCharacterLimit();
  const mediaLimits = getMediaLimits();
  const hasErrors = Object.keys(validationErrors).length > 0;

  const getPlatformPreview = (platform: string) => {
    const platformInfo = platformLimits[platform];
    const isValid = content.length <= (platformInfo?.text || 280);
    return { isValid, limit: platformInfo?.text || 280 };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
          <DialogDescription>
            Compose and publish your content across multiple platforms
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="compose">Compose</TabsTrigger>
            <TabsTrigger value="preview" disabled={selectedAccounts.length === 0}>
              Preview ({selectedAccounts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="flex-1 overflow-y-auto space-y-4 py-4">
            {/* Validation Errors */}
            {hasErrors && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2 text-destructive font-medium text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  Validation Errors
                </div>
                {Object.entries(validationErrors).map(([key, error]) => (
                  <p key={key} className="text-xs text-destructive/90 ml-6">• {error}</p>
                ))}
              </div>
            )}

            {/* Account Selection */}
            <AccountSelector
              selectedAccountIds={selectedAccountIds}
              onAccountsChange={setSelectedAccountIds}
            />

            {/* Content Input */}
            <div className="space-y-2">
              <Label htmlFor="content">Post Content</Label>
              <Textarea
                id="content"
                placeholder="What's on your mind?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                disabled={publishing}
                className={`resize-none ${validationErrors.length || validationErrors.content ? 'border-destructive' : ''}`}
              />
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Write your message for all platforms</span>
                <span className={characterCount > maxLength ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                  {characterCount} / {maxLength}
                </span>
              </div>
              {selectedAccounts.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  {selectedAccounts.map(account => {
                    const preview = getPlatformPreview(account.platform);
                    return (
                      <Badge key={account.id} variant={preview.isValid ? "secondary" : "destructive"} className="text-xs">
                        {account.platform}: {characterCount}/{preview.limit}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Media Upload */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Media</Label>
                {selectedAccounts.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Max: {mediaLimits.images} images, {mediaLimits.videos} videos
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('media-upload')?.click()}
                  disabled={publishing || uploading}
                >
                  <Image className="w-4 h-4 mr-2" />
                  Add Image
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('video-upload')?.click()}
                  disabled={publishing || uploading}
                >
                  <Video className="w-4 h-4 mr-2" />
                  Add Video
                </Button>
              </div>
            <input
              id="media-upload"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <input
              id="video-upload"
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Media Preview */}
            {mediaFiles.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {mediaFiles.map((file, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                      {file.type.startsWith('image/') ? (
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Video className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeMedia(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {uploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-xs text-muted-foreground text-center">
                  Uploading media... {Math.round(uploadProgress)}%
                </p>
              </div>
            )}
          </div>

            {/* AI Content Optimizer */}
            <div className="space-y-2 border border-primary/20 rounded-lg p-3 bg-primary/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <Label>AI Content Optimizer</Label>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOptimizer(!showOptimizer)}
                >
                  {showOptimizer ? 'Hide' : 'Show'}
                </Button>
              </div>
              {showOptimizer && selectedAccounts.length > 0 && (
                <ContentOptimizer
                  content={content}
                  platforms={selectedAccounts.map(a => a.platform)}
                  onApplyOptimization={handleApplyOptimization}
                />
              )}
            </div>

          {/* Schedule Section */}
          <div className="space-y-3 border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <Label>Schedule</Label>
              <Button
                type="button"
                variant={isScheduled ? "default" : "outline"}
                size="sm"
                onClick={() => setIsScheduled(!isScheduled)}
              >
                {isScheduled ? 'Scheduled' : 'Post Now'}
              </Button>
            </div>

            {isScheduled && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduleDate ? format(scheduleDate, 'PP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduleDate}
                        onSelect={setScheduleDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Time</Label>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

            {/* Publishing Results */}
            {publishResults.length > 0 && (
              <div className="space-y-2 border rounded-lg p-3">
                <Label>Publishing Status</Label>
                <div className="space-y-2">
                  {publishResults.map((result, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="capitalize">{result.platform}</span>
                      {result.success ? (
                        <Badge variant="default" className="gap-1 bg-green-500">
                          <CheckCircle2 className="w-3 h-3" />
                          Published
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Failed
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {selectedAccounts.map(account => {
                  const preview = getPlatformPreview(account.platform);
                  const imageCount = mediaFiles.filter(f => f.type.startsWith('image/')).length;
                  const videoCount = mediaFiles.filter(f => f.type.startsWith('video/')).length;
                  
                  return (
                    <Card key={account.id} className={!preview.isValid ? 'border-destructive' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold capitalize">{account.platform}</h3>
                            <p className="text-xs text-muted-foreground">@{account.account_name}</p>
                          </div>
                          <Badge variant={preview.isValid ? "secondary" : "destructive"}>
                            {characterCount}/{preview.limit}
                          </Badge>
                        </div>
                        
                        <Separator className="my-3" />
                        
                        <div className="space-y-3">
                          <div className="text-sm whitespace-pre-wrap break-words">
                            {content || <span className="text-muted-foreground italic">No content yet...</span>}
                          </div>
                          
                          {mediaFiles.length > 0 && (
                            <div className="grid grid-cols-2 gap-2">
                              {mediaFiles.slice(0, 4).map((file, idx) => (
                                <div key={idx} className="aspect-square bg-muted rounded-lg overflow-hidden">
                                  {file.type.startsWith('image/') ? (
                                    <img
                                      src={URL.createObjectURL(file)}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Video className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            {imageCount > 0 && <span>{imageCount} image{imageCount > 1 ? 's' : ''}</span>}
                            {videoCount > 0 && <span>{videoCount} video{videoCount > 1 ? 's' : ''}</span>}
                          </div>
                          
                          {!preview.isValid && (
                            <div className="flex items-center gap-2 text-xs text-destructive">
                              <AlertTriangle className="h-3 w-3" />
                              Content exceeds {account.platform} character limit
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-between items-center border-t pt-4">
          <div className="text-sm text-muted-foreground">
            {selectedAccounts.length > 0 && (
              <span>Publishing to {selectedAccounts.length} account{selectedAccounts.length > 1 ? 's' : ''}</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={publishing}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePublish}
              disabled={publishing || uploading || hasErrors || !content.trim() || selectedAccountIds.length === 0}
            >
              {publishing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : isScheduled ? (
                'Schedule Post'
              ) : (
                'Publish Now'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
