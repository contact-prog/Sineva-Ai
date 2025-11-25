import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, BookmarkPlus, FileText, Sparkles, Trash2, Eye, Copy, Globe } from "lucide-react";
import { BulkPublishToWordPressModal } from "@/components/shared/BulkPublishToWordPressModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ContentLibraryProps {
  onSelectContent?: (content: string, type: string) => void;
  onSaveAsTemplate?: (content: string) => void;
}

export const ContentLibrary = ({ onSelectContent, onSaveAsTemplate }: ContentLibraryProps) => {
  const [contentHistory, setContentHistory] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<any | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    setLoading(true);
    try {
      // Fetch content history
      const { data: history, error: historyError } = await supabase
        .from('content_history')
        .select('*')
        .eq('is_template', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (historyError) throw historyError;

      // Fetch templates
      const { data: templateData, error: templateError } = await supabase
        .from('content_history')
        .select('*')
        .eq('is_template', true)
        .order('created_at', { ascending: false });

      if (templateError) throw templateError;

      setContentHistory(history || []);
      setTemplates(templateData || []);
    } catch (error: any) {
      console.error('Error fetching content:', error);
      toast.error('Failed to load content library');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('content_history')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Content deleted successfully');
      fetchContent();
    } catch (error: any) {
      console.error('Error deleting content:', error);
      toast.error('Failed to delete content');
    } finally {
      setDeleteId(null);
    }
  };

  const handleSaveAsTemplate = async (item: any) => {
    try {
      const { error } = await supabase
        .from('content_history')
        .update({
          is_template: true,
          template_name: item.topic
        })
        .eq('id', item.id);

      if (error) throw error;

      toast.success('Saved as template!');
      fetchContent();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === filteredHistory.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredHistory.map(item => item.id));
    }
  };

  const handleBulkPublish = () => {
    const selectedContent = contentHistory
      .filter(item => selectedItems.includes(item.id))
      .map(item => ({
        id: item.id,
        topic: item.topic,
        content: item.generated_content
      }));
    
    if (selectedContent.length === 0) {
      toast.error('Please select items to publish');
      return;
    }

    setIsBulkModalOpen(true);
  };

  const filteredHistory = contentHistory.filter(item =>
    item.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.generated_content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTemplates = templates.filter(item =>
    item.template_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.generated_content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ContentCard = ({ item, isTemplate = false }: { item: any; isTemplate?: boolean }) => (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {!isTemplate && (
              <Checkbox
                checked={selectedItems.includes(item.id)}
                onCheckedChange={() => handleToggleSelect(item.id)}
                className="mt-1"
              />
            )}
            <div className="flex-1">
              <CardTitle className="text-base line-clamp-1">
                {isTemplate ? item.template_name : item.topic}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                {new Date(item.created_at).toLocaleDateString()} • {item.content_type}
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-1 ml-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPreviewContent(item)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                navigator.clipboard.writeText(item.generated_content);
                toast.success('Copied to clipboard!');
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
            {!isTemplate && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleSaveAsTemplate(item)}
              >
                <BookmarkPlus className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setDeleteId(item.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {item.generated_content}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">
              {item.tone || 'default'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {item.length || 'medium'}
            </Badge>
            {item.template_used && item.template_used !== 'none' && (
              <Badge variant="secondary" className="text-xs">
                {item.template_used}
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSelectContent?.(item.generated_content, item.content_type)}
          >
            Use This
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search content library..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {selectedItems.length > 0 && (
          <Button onClick={handleBulkPublish} variant="default">
            <Globe className="w-4 h-4 mr-2" />
            Publish {selectedItems.length} to WordPress
          </Button>
        )}
        <Button variant="outline" onClick={fetchContent}>
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="history" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="history">
            <FileText className="h-4 w-4 mr-2" />
            Content History ({filteredHistory.length})
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Sparkles className="h-4 w-4 mr-2" />
            Templates ({filteredTemplates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          {filteredHistory.length > 0 && (
            <div className="flex items-center justify-between mb-4 pt-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedItems.length === filteredHistory.length ? 'Deselect All' : 'Select All'}
              </Button>
              {selectedItems.length > 0 && (
                <Badge variant="secondary">
                  {selectedItems.length} selected
                </Badge>
              )}
            </div>
          )}
          <ScrollArea className="h-[600px] pr-4">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading content...
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No content found</p>
                <p className="text-sm mt-1">Generate some content to build your library</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredHistory.map((item) => (
                  <ContentCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="templates">
          <ScrollArea className="h-[600px] pr-4">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading templates...
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No templates saved yet</p>
                <p className="text-sm mt-1">Save your favorite content as templates for reuse</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredTemplates.map((item) => (
                  <ContentCard key={item.id} item={item} isTemplate />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Content</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this content? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      <AlertDialog open={!!previewContent} onOpenChange={() => setPreviewContent(null)}>
        <AlertDialogContent className="max-w-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {previewContent?.is_template ? previewContent?.template_name : previewContent?.topic}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Created {previewContent && new Date(previewContent.created_at).toLocaleString()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="whitespace-pre-wrap text-sm">
              {previewContent?.generated_content}
            </div>
          </ScrollArea>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (previewContent) {
                  onSelectContent?.(previewContent.generated_content, previewContent.content_type);
                  setPreviewContent(null);
                }
              }}
            >
              Use This Content
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Publish Modal */}
      <BulkPublishToWordPressModal
        open={isBulkModalOpen}
        onOpenChange={(open) => {
          setIsBulkModalOpen(open);
          if (!open) {
            setSelectedItems([]);
            fetchContent();
          }
        }}
        contentItems={contentHistory
          .filter(item => selectedItems.includes(item.id))
          .map(item => ({
            id: item.id,
            topic: item.topic,
            content: item.generated_content
          }))}
      />
    </div>
  );
};
