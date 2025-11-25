import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useConnectedIntegrations } from '@/hooks/useConnectedIntegrations';

interface PublishToWordPressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  defaultTitle?: string;
}

export function PublishToWordPressModal({ 
  open, 
  onOpenChange, 
  content,
  defaultTitle = '' 
}: PublishToWordPressModalProps) {
  const { integrations } = useConnectedIntegrations();
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [title, setTitle] = useState(defaultTitle);
  const [excerpt, setExcerpt] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryInput, setCategoryInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [publishStatus, setPublishStatus] = useState<'draft' | 'publish'>('draft');
  const [isPublishing, setIsPublishing] = useState(false);

  // Filter WordPress integrations
  const wordpressSites = integrations.filter(
    (int) => int.platform === 'wordpress' && int.connected
  );

  // Auto-select first site if only one exists
  useEffect(() => {
    if (wordpressSites.length === 1 && !selectedSiteId) {
      setSelectedSiteId(wordpressSites[0].id);
    }
  }, [wordpressSites, selectedSiteId]);

  // Auto-generate excerpt from content
  useEffect(() => {
    if (open && content && !excerpt) {
      const plainText = content.replace(/<[^>]*>/g, '').substring(0, 200);
      setExcerpt(plainText + (content.length > 200 ? '...' : ''));
    }
  }, [open, content, excerpt]);

  // Reset title when modal opens with new defaultTitle
  useEffect(() => {
    if (open && defaultTitle) {
      setTitle(defaultTitle);
    }
  }, [open, defaultTitle]);

  const handleAddCategory = () => {
    if (categoryInput.trim() && !categories.includes(categoryInput.trim())) {
      setCategories([...categories, categoryInput.trim()]);
      setCategoryInput('');
    }
  };

  const handleRemoveCategory = (category: string) => {
    setCategories(categories.filter(c => c !== category));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handlePublish = async () => {
    if (!selectedSiteId) {
      toast.error('Please select a WordPress site');
      return;
    }

    if (!title.trim()) {
      toast.error('Please enter a post title');
      return;
    }

    setIsPublishing(true);

    try {
      const { data, error } = await supabase.functions.invoke('publish-to-wordpress', {
        body: {
          integrationId: selectedSiteId,
          title: title.trim(),
          content,
          excerpt: excerpt.trim() || undefined,
          categories: categories.length > 0 ? categories : undefined,
          tags: tags.length > 0 ? tags : undefined,
          status: publishStatus,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(
          <div className="flex items-center gap-2">
            <span>Post {publishStatus === 'publish' ? 'published' : 'saved as draft'} successfully!</span>
            <a 
              href={data.post.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              View Post <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        );
        onOpenChange(false);
        // Reset form
        setTitle('');
        setExcerpt('');
        setCategories([]);
        setTags([]);
        setPublishStatus('draft');
      } else {
        throw new Error(data.error || 'Failed to publish');
      }
    } catch (error: any) {
      console.error('Publish error:', error);
      toast.error(error.message || 'Failed to publish to WordPress');
    } finally {
      setIsPublishing(false);
    }
  };

  if (wordpressSites.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Publish to WordPress</DialogTitle>
            <DialogDescription>
              No WordPress sites connected. Please connect a WordPress site in the Integrations page first.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={() => window.location.href = '/app/integrations'}>
              Go to Integrations
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Publish to WordPress</DialogTitle>
          <DialogDescription>
            Configure your post settings before publishing to WordPress
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* WordPress Site Selector */}
          {wordpressSites.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="site">WordPress Site</Label>
              <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                <SelectTrigger id="site" className="bg-background">
                  <SelectValue placeholder="Select a site" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {wordpressSites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.metadata?.site_url || site.accountName || 'WordPress Site'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Post Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Post Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter post title"
              className="bg-background"
            />
          </div>

          {/* Excerpt */}
          <div className="space-y-2">
            <Label htmlFor="excerpt">Excerpt</Label>
            <Textarea
              id="excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Short summary of the post (auto-generated from content)"
              rows={3}
              className="bg-background"
            />
          </div>

          {/* Categories */}
          <div className="space-y-2">
            <Label htmlFor="categories">Categories</Label>
            <div className="flex gap-2">
              <Input
                id="categories"
                value={categoryInput}
                onChange={(e) => setCategoryInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                placeholder="Add category and press Enter"
                className="bg-background"
              />
              <Button type="button" onClick={handleAddCategory} variant="secondary">
                Add
              </Button>
            </div>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {categories.map((category) => (
                  <Badge key={category} variant="secondary" className="gap-1">
                    {category}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => handleRemoveCategory(category)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add tag and press Enter"
                className="bg-background"
              />
              <Button type="button" onClick={handleAddTag} variant="secondary">
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="gap-1">
                    {tag}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => handleRemoveTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Publish Status */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="publish-status" className="text-base">
                Publish Immediately
              </Label>
              <p className="text-sm text-muted-foreground">
                {publishStatus === 'publish' 
                  ? 'Post will be published immediately' 
                  : 'Post will be saved as draft'}
              </p>
            </div>
            <Switch
              id="publish-status"
              checked={publishStatus === 'publish'}
              onCheckedChange={(checked) => setPublishStatus(checked ? 'publish' : 'draft')}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPublishing}>
            Cancel
          </Button>
          <Button onClick={handlePublish} disabled={isPublishing}>
            {isPublishing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {publishStatus === 'publish' ? 'Publish Now' : 'Save as Draft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
