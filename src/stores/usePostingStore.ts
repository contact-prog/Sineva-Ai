import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface QueueJob {
  id: string;
  user_id: string;
  integration_ids: string[];
  platforms: Array<'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'youtube' | 'pinterest' | 'facebook_ads' | 'google_ads' | 'whatsapp' | 'tiktok' | 'google_business' | 'wordpress' | 'mailchimp' | 'shopify'>;
  content: string;
  media_urls: string[];
  scheduled_for: string;
  status: 'pending' | 'scheduled' | 'processing' | 'published' | 'failed' | 'cancelled' | 'paused';
  attempts: number;
  max_attempts: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  error_message?: string;
  posted_at?: string;
  platform_post_ids?: any;
  metadata?: any;
}

interface PostingStore {
  queueJobs: QueueJob[];
  loading: boolean;
  draftContent: string;
  realtimeChannel: RealtimeChannel | null;
  
  fetchQueue: () => Promise<void>;
  addToQueue: (job: Omit<QueueJob, 'id' | 'user_id' | 'attempts'>) => Promise<void>;
  cancelJob: (jobId: string) => Promise<void>;
  retryJob: (jobId: string) => Promise<void>;
  setDraftContent: (content: string) => void;
  subscribeToQueue: () => void;
  unsubscribeFromQueue: () => void;
}

export const usePostingStore = create<PostingStore>((set, get) => ({
  queueJobs: [],
  loading: false,
  draftContent: '',
  realtimeChannel: null,

  fetchQueue: async () => {
    set({ loading: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('posting_queue')
        .select('*')
        .eq('user_id', user.id)
        .order('scheduled_for', { ascending: false })
        .limit(50);

      if (error) throw error;

      set({ queueJobs: data || [] });
    } catch (error) {
      console.error('Error fetching queue:', error);
    } finally {
      set({ loading: false });
    }
  },

  addToQueue: async (job) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('posting_queue')
        .insert([{
          ...job,
          user_id: user.id,
          attempts: 0,
        }]);

      if (error) throw error;

      await get().fetchQueue();
    } catch (error) {
      console.error('Error adding to queue:', error);
      throw error;
    }
  },

  cancelJob: async (jobId) => {
    try {
      const { error } = await supabase
        .from('posting_queue')
        .update({ status: 'cancelled' })
        .eq('id', jobId);

      if (error) throw error;

      await get().fetchQueue();
    } catch (error) {
      console.error('Error cancelling job:', error);
      throw error;
    }
  },

  retryJob: async (jobId) => {
    try {
      const { error } = await supabase
        .from('posting_queue')
        .update({
          status: 'pending',
          attempts: 0,
          error_message: null,
          next_retry_at: null,
        })
        .eq('id', jobId);

      if (error) throw error;

      await get().fetchQueue();
    } catch (error) {
      console.error('Error retrying job:', error);
      throw error;
    }
  },

  setDraftContent: (content) => set({ draftContent: content }),

  subscribeToQueue: () => {
    const channel = supabase
      .channel('posting-queue-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posting_queue',
        },
        () => {
          get().fetchQueue();
        }
      )
      .subscribe();

    set({ realtimeChannel: channel });
  },

  unsubscribeFromQueue: () => {
    const { realtimeChannel } = get();
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      set({ realtimeChannel: null });
    }
  },
}));
