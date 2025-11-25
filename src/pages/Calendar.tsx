import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock, TrendingUp } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CalendarView } from "@/components/calendar/CalendarView";
import { CalendarTopBar } from "@/components/calendar/CalendarTopBar";
import { EventDetailsDialog } from "@/components/calendar/EventDetailsDialog";
import { QueueManager } from "@/components/queue/QueueManager";
import { BestTimeRecommendations } from "@/components/calendar/BestTimeRecommendations";
import { Enums } from "@/integrations/supabase/types";

export default function Calendar() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Enums<'integration_platform'>[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<Enums<'queue_status'>[]>(['scheduled', 'pending']);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  
  const [stats, setStats] = useState({
    scheduled: 0,
    pending: 0,
    engagementRate: 0,
    engagementChange: 0,
  });
  
  const [statusCounts, setStatusCounts] = useState({
    draft: 0,
    scheduled: 0,
    processing: 0,
    published: 0,
    failed: 0,
    pending: 0,
    cancelled: 0,
    paused: 0,
  });

  // Fetch posts from posting_queue
  const fetchPosts = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all posts (not just scheduled ones) for accurate counts
      const { data, error } = await supabase
        .from('posting_queue')
        .select('*')
        .eq('user_id', user.id)
        .order('scheduled_for', { ascending: true });

      if (error) throw error;

      // Transform to calendar events (showing more statuses including published)
      const calendarEvents = (data || [])
        .filter((post) => ['pending', 'scheduled', 'processing', 'paused', 'published', 'cancelled'].includes(post.status))
        .map((post) => ({
          id: post.id,
          title: post.content.slice(0, 50) + '...',
          content: post.content,
          platform: post.platforms[0] || 'unknown', // Use first platform
          start: new Date(post.scheduled_for),
          end: new Date(post.scheduled_for),
          status: post.status as 'draft' | 'scheduled' | 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled',
          mediaUrls: post.media_urls || [],
          integrationId: post.integration_ids?.[0],
        }));

      setEvents(calendarEvents);

      // Calculate status counts for all posts
      const counts = {
        draft: data?.filter((p) => p.status === 'pending' && !p.scheduled_for).length || 0,
        scheduled: data?.filter((p) => p.status === 'scheduled').length || 0,
        processing: data?.filter((p) => p.status === 'processing').length || 0,
        published: data?.filter((p) => p.status === 'published').length || 0,
        failed: data?.filter((p) => p.status === 'failed').length || 0,
        pending: data?.filter((p) => p.status === 'pending').length || 0,
        cancelled: data?.filter((p) => p.status === 'cancelled').length || 0,
        paused: data?.filter((p) => p.status === 'paused').length || 0,
      };
      setStatusCounts(counts);

      // Calculate real engagement metrics from published_posts
      const now = new Date();
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      // Fetch published posts for engagement calculation
      const { data: publishedPosts } = await supabase
        .from('published_posts')
        .select('likes, comments, shares, views, published_at')
        .eq('user_id', user.id)
        .gte('published_at', twoWeeksAgo.toISOString());

      // Calculate engagement rate (likes + comments + shares) / views * 100
      const thisWeekPosts = publishedPosts?.filter(p => 
        new Date(p.published_at || '') >= lastWeek
      ) || [];
      
      const lastWeekPosts = publishedPosts?.filter(p => {
        const date = new Date(p.published_at || '');
        return date >= twoWeeksAgo && date < lastWeek;
      }) || [];

      const calculateEngagementRate = (posts: any[]) => {
        if (!posts || posts.length === 0) return 0;
        const totalEngagement = posts.reduce((sum, p) => 
          sum + (p.likes || 0) + (p.comments || 0) + (p.shares || 0), 0
        );
        const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);
        return totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0;
      };

      const thisWeekRate = calculateEngagementRate(thisWeekPosts);
      const lastWeekRate = calculateEngagementRate(lastWeekPosts);
      const rateChange = lastWeekRate > 0 ? thisWeekRate - lastWeekRate : 0;

      // Calculate stats for display cards
      const scheduled = counts.scheduled;
      const pending = counts.pending;
      
      setStats({ 
        scheduled, 
        pending, 
        engagementRate: thisWeekRate,
        engagementChange: rateChange
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
    
    // Set up realtime subscription for automatic updates with status notifications
    const channel = supabase
      .channel('calendar-queue-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'posting_queue',
        },
        (payload) => {
          console.log('Posting queue update:', payload);
          const newPost = payload.new as any;
          const oldPost = payload.old as any;
          
          // Show toast notifications for status changes
          if (newPost.status !== oldPost.status) {
            if (newPost.status === 'published') {
              toast({
                title: "✅ Post Published!",
                description: `Your post to ${newPost.platforms?.join(', ') || 'social media'} was published successfully.`,
              });
            } else if (newPost.status === 'failed') {
              toast({
                title: "❌ Post Failed",
                description: newPost.error_message || "Failed to publish post. Check the calendar for details.",
                variant: "destructive",
              });
            } else if (newPost.status === 'processing') {
              toast({
                title: "⏳ Publishing Post",
                description: `Publishing to ${newPost.platforms?.join(', ') || 'social media'}...`,
              });
            }
          }
          
          // Refresh calendar data
          fetchPosts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posting_queue',
        },
        () => {
          fetchPosts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'posting_queue',
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter events with search, platform, status, and account filters
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const contentMatch = event.content.toLowerCase().includes(query);
        const titleMatch = (event.title || '').toLowerCase().includes(query);
        if (!contentMatch && !titleMatch) return false;
      }

      // Platform filter
      if (selectedPlatforms.length > 0) {
        if (!selectedPlatforms.includes(event.platform)) return false;
      }

      // Status filter
      if (selectedStatuses.length > 0) {
        if (!selectedStatuses.includes(event.status)) return false;
      }

      // Account filter
      if (selectedAccountIds.length > 0) {
        if (!event.integrationId || !selectedAccountIds.includes(event.integrationId)) return false;
      }

      return true;
    });
  }, [events, searchQuery, selectedPlatforms, selectedStatuses, selectedAccountIds]);

  const handleEventClick = async (event: any) => {
    try {
      const { data, error } = await supabase
        .from('posting_queue')
        .select('*')
        .eq('id', event.id)
        .single();

      if (error) throw error;
      setSelectedEvent(data);
      setDialogOpen(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEventDrop = async (event: any, start: Date, end: Date) => {
    try {
      const { error } = await supabase
        .from('posting_queue')
        .update({ scheduled_for: start.toISOString() })
        .eq('id', event.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Post rescheduled successfully",
      });

      fetchPosts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSelectSlot = ({ start }: { start: Date; end: Date }) => {
    // Navigate to create post with pre-selected date
    navigate(`/app/calendar/create?date=${start.toISOString()}`);
  };

  const handleCreatePost = () => {
    // Navigate to create post page
    navigate('/app/calendar/create');
  };

  const handleStatusToggle = (status: Enums<'queue_status'>) => {
    setSelectedStatuses((prev) => {
      if (prev.includes(status)) {
        return prev.filter((s) => s !== status);
      } else {
        return [...prev, status];
      }
    });
  };

  const handleRetry = async (event: any) => {
    try {
      const { error } = await supabase
        .from('posting_queue')
        .update({ 
          status: 'pending',
          attempts: 0,
          error_message: null 
        })
        .eq('id', event.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Post queued for retry",
      });

      fetchPosts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDuplicate = async (event: any) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('posting_queue')
        .select('*')
        .eq('id', event.id)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('posting_queue')
        .insert({
          user_id: data.user_id,
          integration_ids: data.integration_ids,
          platforms: data.platforms,
          content: data.content,
          media_urls: data.media_urls,
          scheduled_for: new Date(Date.now() + 86400000).toISOString(), // +1 day
          priority: data.priority,
          status: 'scheduled',
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Post duplicated successfully",
      });

      fetchPosts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditEvent = (event: any) => {
    // Navigate to edit page with event data
    navigate(`/app/calendar/edit/${event.id}`);
  };

  const handleDeleteEvent = async (event: any) => {
    try {
      const { error } = await supabase
        .from('posting_queue')
        .delete()
        .eq('id', event.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Post deleted successfully",
      });

      fetchPosts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (eventId: string) => {
    navigate(`/app/calendar/edit/${eventId}`);
  };

  const handleDelete = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('posting_queue')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Post deleted successfully",
      });

      setDialogOpen(false);
      fetchPosts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePause = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('posting_queue')
        .update({ status: 'paused' })
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Post paused",
      });

      setDialogOpen(false);
      fetchPosts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleResume = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('posting_queue')
        .update({ status: 'scheduled' })
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Post resumed",
      });

      setDialogOpen(false);
      fetchPosts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancel = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('posting_queue')
        .update({ status: 'cancelled' })
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Post cancelled",
      });

      setDialogOpen(false);
      fetchPosts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Top Bar with Search and Filters */}
      <CalendarTopBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusCounts={statusCounts}
        selectedStatuses={selectedStatuses}
        onStatusToggle={handleStatusToggle}
        selectedPlatforms={selectedPlatforms}
        onPlatformsChange={setSelectedPlatforms}
        selectedAccountIds={selectedAccountIds}
        onAccountsChange={setSelectedAccountIds}
        onCreatePost={handleCreatePost}
      />

      {/* Calendar View - Main Focus */}
      <Card className="glass-card border-primary/20">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-[700px]">
              <div className="text-muted-foreground">Loading calendar...</div>
            </div>
          ) : (
            <CalendarView
              events={filteredEvents}
              onEventClick={handleEventClick}
              onEventDrop={handleEventDrop}
              onSelectSlot={handleSelectSlot}
              onEdit={handleEditEvent}
              onDuplicate={handleDuplicate}
              onDelete={handleDeleteEvent}
              onRetry={handleRetry}
            />
          )}
        </CardContent>
      </Card>

      {/* Stats and Best Times - Below Calendar */}
      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="glass-card border-primary/20 hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Posts</CardTitle>
            <CalendarIcon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.scheduled}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-primary/20 hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-primary/20 hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {stats.engagementRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.engagementChange > 0 && '+'}
              {stats.engagementChange.toFixed(1)}% from last week
            </p>
          </CardContent>
        </Card>

        {/* Best Time Recommendations */}
        <BestTimeRecommendations />
      </div>

      {/* Queue Manager */}
      <QueueManager />

      {/* Event Details Dialog */}
      <EventDetailsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={selectedEvent}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPause={handlePause}
        onResume={handleResume}
        onCancel={handleCancel}
      />
    </div>
  );
}
