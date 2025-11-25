import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      postId,
      title,
      content,
      excerpt,
      status,
    } = await req.json();
    
    console.log('Updating WordPress post:', postId);

    if (!postId) {
      throw new Error('Missing required field: postId');
    }

    // Get authorization header and user
    const authHeader = req.headers.get('authorization');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader || '' } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get the published post
    const { data: post, error: postError } = await supabaseClient
      .from('published_posts')
      .select('*, integrations!inner(*)')
      .eq('id', postId)
      .eq('user_id', user.id)
      .eq('platform', 'wordpress')
      .single();

    if (postError || !post) {
      throw new Error('Published post not found');
    }

    const integration = post.integrations;
    const siteUrl = integration.metadata?.site_url;
    
    if (!siteUrl) {
      throw new Error('Site URL not found');
    }

    // Prepare update data
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (status !== undefined) updateData.status = status;

    // Update post on WordPress
    const wpResponse = await fetch(
      `${siteUrl}/wp-json/wp/v2/posts/${post.external_id}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Basic ${integration.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      }
    );

    if (!wpResponse.ok) {
      const errorText = await wpResponse.text();
      console.error('WordPress API error:', wpResponse.status, errorText);
      throw new Error(`Failed to update WordPress post: ${wpResponse.status}`);
    }

    const updatedPost = await wpResponse.json();
    console.log('Post updated successfully on WordPress');

    // Update our database record
    const dbUpdateData: any = {
      status: updatedPost.status,
    };
    
    if (content !== undefined) {
      dbUpdateData.content = content;
    }

    const { error: dbUpdateError } = await supabaseClient
      .from('published_posts')
      .update(dbUpdateData)
      .eq('id', postId);

    if (dbUpdateError) {
      console.error('Failed to update database record:', dbUpdateError);
      // Don't fail the request, WordPress was updated successfully
    }

    return new Response(
      JSON.stringify({
        success: true,
        post: {
          id: updatedPost.id,
          title: updatedPost.title.rendered,
          link: updatedPost.link,
          status: updatedPost.status,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error updating WordPress post:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
