import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Processing queue retry logic...');

    // Calculate exponential backoff for retry
    const calculateNextRetry = (attempts: number): Date => {
      const baseDelayMinutes = 5;
      const delayMinutes = baseDelayMinutes * Math.pow(2, attempts); // Exponential backoff
      const maxDelayMinutes = 1440; // Max 24 hours
      const actualDelay = Math.min(delayMinutes, maxDelayMinutes);
      
      const nextRetry = new Date();
      nextRetry.setMinutes(nextRetry.getMinutes() + actualDelay);
      return nextRetry;
    };

    // 1. Process failed posts that are ready for retry
    const now = new Date().toISOString();
    const { data: retryablePosts, error: retryableError } = await supabase
      .from('posting_queue')
      .select('*')
      .eq('status', 'failed')
      .lt('attempts', supabase.rpc('max_attempts'))
      .or(`next_retry_at.is.null,next_retry_at.lt.${now}`)
      .order('priority', { ascending: false })
      .limit(10);

    if (retryableError) {
      console.error('Error fetching retryable posts:', retryableError);
    } else if (retryablePosts && retryablePosts.length > 0) {
      console.log(`Found ${retryablePosts.length} posts ready for retry`);

      for (const post of retryablePosts) {
        const newAttempts = (post.attempts || 0) + 1;
        
        if (newAttempts < (post.max_attempts || 3)) {
          // Schedule for retry with exponential backoff
          const nextRetry = calculateNextRetry(newAttempts);
          
          const { error: updateError } = await supabase
            .from('posting_queue')
            .update({
              status: 'scheduled',
              attempts: newAttempts,
              next_retry_at: nextRetry.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', post.id);

          if (updateError) {
            console.error(`Error updating post ${post.id}:`, updateError);
          } else {
            console.log(`Post ${post.id} scheduled for retry ${newAttempts} at ${nextRetry}`);
          }
        } else {
          // Max attempts reached, keep as failed
          const { error: maxAttemptsError } = await supabase
            .from('posting_queue')
            .update({
              error_message: `Max retry attempts (${post.max_attempts}) reached`,
              updated_at: new Date().toISOString(),
            })
            .eq('id', post.id);

          if (maxAttemptsError) {
            console.error(`Error marking max attempts for ${post.id}:`, maxAttemptsError);
          } else {
            console.log(`Post ${post.id} reached max attempts`);
          }
        }
      }
    }

    // 2. Process scheduled posts by priority
    const { data: scheduledPosts, error: scheduledError } = await supabase
      .from('posting_queue')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_for', now)
      .order('priority', { ascending: false })
      .order('scheduled_for', { ascending: true })
      .limit(20);

    if (scheduledError) {
      console.error('Error fetching scheduled posts:', scheduledError);
    } else if (scheduledPosts && scheduledPosts.length > 0) {
      console.log(`Found ${scheduledPosts.length} posts ready for processing`);

      // Group by priority for processing
      const priorityGroups = {
        urgent: scheduledPosts.filter((p) => p.priority === 'urgent'),
        high: scheduledPosts.filter((p) => p.priority === 'high'),
        medium: scheduledPosts.filter((p) => p.priority === 'medium'),
        low: scheduledPosts.filter((p) => p.priority === 'low'),
      };

      // Process urgent first, then high, medium, low
      for (const [priority, posts] of Object.entries(priorityGroups)) {
        if (posts.length > 0) {
          console.log(`Processing ${posts.length} ${priority} priority posts`);
          
          for (const post of posts) {
            // Mark as processing
            const { error: processingError } = await supabase
              .from('posting_queue')
              .update({
                status: 'processing',
                last_attempt_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', post.id);

            if (processingError) {
              console.error(`Error marking post ${post.id} as processing:`, processingError);
              continue;
            }

            // Call publish-social-post function for each post
            try {
              const { data: publishData, error: publishError } = await supabase.functions.invoke(
                'publish-social-post',
                {
                  body: { queueId: post.id },
                }
              );

              if (publishError) {
                throw publishError;
              }

              console.log(`Post ${post.id} published successfully`);
            } catch (publishError: any) {
              console.error(`Error publishing post ${post.id}:`, publishError);
              
              const newAttempts = (post.attempts || 0) + 1;
              const nextRetry = calculateNextRetry(newAttempts);
              
              // Update with error and schedule retry
              await supabase
                .from('posting_queue')
                .update({
                  status: 'failed',
                  attempts: newAttempts,
                  error_message: publishError.message || 'Unknown error',
                  next_retry_at: nextRetry.toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq('id', post.id);
            }
          }
        }
      }
    }

    // 3. Clean up old cancelled/published posts (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { error: cleanupError } = await supabase
      .from('posting_queue')
      .delete()
      .in('status', ['cancelled', 'published'])
      .lt('updated_at', thirtyDaysAgo.toISOString());

    if (cleanupError) {
      console.error('Error cleaning up old posts:', cleanupError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Queue processing completed',
        retryable: retryablePosts?.length || 0,
        scheduled: scheduledPosts?.length || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in process-queue-retry:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
