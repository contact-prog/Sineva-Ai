import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateScheduledPostRequest {
  postId: string;
  updates: {
    content?: string;
    scheduledFor?: string;
    platforms?: string[];
    mediaUrls?: string[];
    priority?: 'low' | 'medium' | 'high';
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { postId, updates }: UpdateScheduledPostRequest = await req.json();
    console.log('Updating scheduled post:', postId);

    if (!postId) {
      throw new Error('Post ID is required');
    }

    // Verify post belongs to user
    const { data: existingPost, error: fetchError } = await supabase
      .from('posting_queue')
      .select('*')
      .eq('id', postId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingPost) {
      throw new Error('Post not found or access denied');
    }

    // Cannot update published or cancelled posts
    if (existingPost.status === 'published' || existingPost.status === 'cancelled') {
      throw new Error(`Cannot update ${existingPost.status} posts`);
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.content !== undefined) {
      updateData.content = updates.content;
    }

    if (updates.scheduledFor !== undefined) {
      updateData.scheduled_for = updates.scheduledFor;
    }

    if (updates.platforms !== undefined) {
      updateData.platforms = updates.platforms;
      
      // Also update integration_ids based on new platforms
      const { data: accounts } = await supabase
        .from('integrations')
        .select('id')
        .eq('user_id', user.id)
        .in('platform', updates.platforms)
        .eq('connected', true);
      
      if (accounts && accounts.length > 0) {
        updateData.integration_ids = accounts.map(a => a.id);
      }
    }

    if (updates.mediaUrls !== undefined) {
      updateData.media_urls = updates.mediaUrls;
    }

    if (updates.priority !== undefined) {
      updateData.priority = updates.priority;
    }

    // Update the post
    const { data: updatedPost, error: updateError } = await supabase
      .from('posting_queue')
      .update(updateData)
      .eq('id', postId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating post:', updateError);
      throw new Error('Failed to update post');
    }

    console.log('Successfully updated post:', postId);

    return new Response(
      JSON.stringify({
        success: true,
        post: updatedPost
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in update-scheduled-post:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error?.message || 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
