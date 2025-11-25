import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CalendarEvent } from '@/components/calendar/CalendarGrid';
import { toast } from 'sonner';

interface UseCalendarEventsParams {
  platforms?: string[];
  statuses?: string[];
  accountIds?: string[];
}

export function useCalendarEvents(params: UseCalendarEventsParams = {}) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch integrations
      const { data: intData, error: intError } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', user.id);

      if (intError) throw intError;
      setIntegrations(intData || []);

      // Build query
      let query = supabase
        .from('posting_queue')
        .select('*')
        .eq('user_id', user.id);

      // Apply filters
      if (params.platforms && params.platforms.length > 0) {
        query = query.overlaps('platforms', params.platforms);
      }

      if (params.statuses && params.statuses.length > 0) {
        const validStatuses = params.statuses.filter(s => 
          ['pending', 'scheduled', 'processing', 'published', 'failed', 'cancelled', 'paused'].includes(s)
        );
        if (validStatuses.length > 0) {
          query = query.in('status', validStatuses as any);
        }
      }

      if (params.accountIds && params.accountIds.length > 0) {
        query = query.overlaps('integration_ids', params.accountIds);
      }

      const { data, error: fetchError } = await query.order('scheduled_for', { ascending: true });

      if (fetchError) throw fetchError;

      // Transform to calendar events
      const calendarEvents: CalendarEvent[] = (data || []).map((item: any) => ({
        id: item.id,
        title: item.content.substring(0, 50),
        content: item.content,
        platform: item.platforms[0] || 'unknown',
        start: new Date(item.scheduled_for),
        end: new Date(item.scheduled_for),
        status: item.status,
        mediaUrls: item.media_urls || [],
        isDraft: false,
        integrationId: item.integration_ids[0],
      }));

      setEvents(calendarEvents);
    } catch (err: any) {
      console.error('Error fetching calendar events:', err);
      setError(err.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();

    // Subscribe to real-time changes with status notifications
    const channel = supabase
      .channel('calendar-events')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'posting_queue',
        },
        (payload) => {
          const newPost = payload.new as any;
          const oldPost = payload.old as any;
          
          // Show toast notifications for status changes
          if (newPost.status !== oldPost.status) {
            if (newPost.status === 'published') {
              toast.success('Post published successfully!', {
                description: `Posted to ${newPost.platforms?.join(', ') || 'social media'}`,
              });
            } else if (newPost.status === 'failed') {
              toast.error('Post failed to publish', {
                description: newPost.error_message || 'Check calendar for details',
              });
            } else if (newPost.status === 'processing') {
              toast.info('Publishing post...', {
                description: `Posting to ${newPost.platforms?.join(', ') || 'social media'}`,
              });
            }
          }
          
          fetchEvents();
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
          fetchEvents();
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
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [JSON.stringify(params)]);

  const addEvent = async (eventData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('posting_queue')
        .insert([{
          user_id: user.id,
          content: eventData.post_content,
          integration_ids: [eventData.integration_id],
          platforms: [eventData.platform],
          media_urls: eventData.media_urls || [],
          scheduled_for: eventData.scheduled_for,
          status: 'scheduled',
          priority: 'medium',
          max_attempts: 3,
        }]);

      if (error) throw error;
      await fetchEvents();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const rescheduleEvent = async (eventId: string, newDate: Date) => {
    try {
      const { error } = await supabase
        .from('posting_queue')
        .update({ scheduled_for: newDate.toISOString() })
        .eq('id', eventId);

      if (error) throw error;
      await fetchEvents();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('posting_queue')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      await fetchEvents();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const updateEvent = async (eventId: string, updates: any) => {
    try {
      const { error } = await supabase
        .from('posting_queue')
        .update(updates)
        .eq('id', eventId);

      if (error) throw error;
      await fetchEvents();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return {
    events,
    integrations,
    loading,
    error,
    addEvent,
    rescheduleEvent,
    deleteEvent,
    updateEvent,
    refetch: fetchEvents,
  };
}
