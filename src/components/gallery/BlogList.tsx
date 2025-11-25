import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileText, Eye, Pencil, Trash2, Calendar, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface Blog {
  id: string;
  topic: string;
  content: string;
  excerpt: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  category: string | null;
  tags: string[] | null;
  keywords: string[] | null;
  meta_description: string | null;
  featured_image_url: string | null;
  ai_generated: boolean | null;
}

export default function BlogList() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingBlogId, setDeletingBlogId] = useState<string | null>(null);

  useEffect(() => {
    loadBlogs();
  }, []);

  const loadBlogs = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to view your blogs');
        return;
      }

      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBlogs(data || []);
    } catch (error: any) {
      console.error('Error loading blogs:', error);
      toast.error('Failed to load blogs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleView = (blog: Blog) => {
    setSelectedBlog(blog);
    setViewDialogOpen(true);
  };

  const handleDeleteClick = (blogId: string) => {
    setDeletingBlogId(blogId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingBlogId) return;

    try {
      const { error } = await supabase
        .from('blogs')
        .delete()
        .eq('id', deletingBlogId);

      if (error) throw error;

      setBlogs(prev => prev.filter(b => b.id !== deletingBlogId));
      toast.success('Blog deleted successfully');
    } catch (error: any) {
      console.error('Error deleting blog:', error);
      toast.error('Failed to delete blog');
    } finally {
      setDeleteDialogOpen(false);
      setDeletingBlogId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'default';
      case 'draft':
        return 'secondary';
      case 'scheduled':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (blogs.length === 0) {
    return (
      <Card className="p-12 text-center">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No Blogs Yet</h3>
        <p className="text-muted-foreground mb-4">
          Start by generating your first blog post in the Content section
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {blogs.map((blog) => (
          <Card key={blog.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base line-clamp-2 mb-1">
                    {blog.topic}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={getStatusColor(blog.status)} className="text-xs">
                      {blog.status}
                    </Badge>
                    {blog.ai_generated && (
                      <Badge variant="outline" className="text-xs">
                        AI Generated
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Excerpt */}
              {blog.excerpt && (
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {blog.excerpt}
                </p>
              )}

              {/* Metadata */}
              <div className="space-y-1.5 text-xs text-muted-foreground">
                {blog.category && (
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    <span>{blog.category}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDistanceToNow(new Date(blog.created_at), { addSuffix: true })}</span>
                </div>
              </div>

              {/* Tags */}
              {blog.tags && blog.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {blog.tags.slice(0, 3).map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {blog.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{blog.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleView(blog)}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteClick(blog.id)}
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedBlog?.topic}</DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={getStatusColor(selectedBlog?.status || 'draft')}>
                  {selectedBlog?.status}
                </Badge>
                {selectedBlog?.category && (
                  <Badge variant="outline">{selectedBlog.category}</Badge>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {/* Meta Information */}
              {selectedBlog?.meta_description && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1">Meta Description</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedBlog.meta_description}
                  </p>
                </div>
              )}

              {/* Keywords */}
              {selectedBlog?.keywords && selectedBlog.keywords.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Keywords</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedBlog.keywords.map((keyword, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Content */}
              <div>
                <p className="text-sm font-medium mb-2">Content</p>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {selectedBlog?.content.split('\n\n').map((paragraph, idx) => (
                    <p key={idx} className="mb-3">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Blog</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this blog? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
