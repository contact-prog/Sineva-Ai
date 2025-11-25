import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteScheduledPostRequest {
  postId: string;
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

    const { postId }: DeleteScheduledPostRequest = await req.json();
    console.log('Deleting scheduled post:', postId);

    if (!postId) {
      throw new Error('Post ID is required');
    }

    // Verify post belongs to user and is not already published
    const { data: existingPost, error: fetchError } = await supabase
      .from('posting_queue')
      .select('*')
      .eq('id', postId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingPost) {
      throw new Error('Post not found or access denied');
    }

    // Cannot delete published posts, but can cancel scheduled ones
    if (existingPost.status === 'published') {
      throw new Error('Cannot delete published posts');
    }

    // Mark as cancelled instead of deleting
    const { error: updateError } = await supabase
      .from('posting_queue')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error cancelling post:', updateError);
      throw new Error('Failed to cancel post');
    }

    console.log('Successfully cancelled post:', postId);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Post cancelled successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in delete-scheduled-post:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error?.message || 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
