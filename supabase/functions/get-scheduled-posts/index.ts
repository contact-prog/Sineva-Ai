import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GetScheduledPostsRequest {
  startDate?: string;
  endDate?: string;
  platforms?: string[];
  status?: 'pending' | 'scheduled' | 'published' | 'failed';
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

    const { startDate, endDate, platforms, status }: GetScheduledPostsRequest = await req.json();
    console.log('Fetching scheduled posts for user:', user.id);

    // Build query
    let query = supabase
      .from('posting_queue')
      .select('*')
      .eq('user_id', user.id)
      .order('scheduled_for', { ascending: true });

    // Apply filters
    if (startDate) {
      query = query.gte('scheduled_for', startDate);
    }

    if (endDate) {
      query = query.lte('scheduled_for', endDate);
    }

    if (platforms && platforms.length > 0) {
      query = query.overlaps('platforms', platforms);
    }

    if (status) {
      query = query.eq('status', status);
    } else {
      // Default to non-published posts
      query = query.in('status', ['pending', 'scheduled']);
    }

    const { data: posts, error: postsError } = await query;

    if (postsError) {
      console.error('Error fetching posts:', postsError);
      throw new Error('Failed to fetch scheduled posts');
    }

    console.log(`Found ${posts?.length || 0} scheduled posts`);

    return new Response(
      JSON.stringify({
        success: true,
        posts: posts || [],
        count: posts?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in get-scheduled-posts:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error?.message || 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
