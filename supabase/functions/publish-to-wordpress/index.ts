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
      integrationId,
      title,
      content,
      excerpt,
      categories = [],
      tags = [],
      featuredImageUrl,
      status = 'draft', // 'draft' or 'publish'
      postId, // Optional: if updating existing post
    } = await req.json();
    
    console.log('Publishing to WordPress:', { integrationId, title, status, postId });

    if (!integrationId || !title || !content) {
      throw new Error('Missing required fields: integrationId, title, or content');
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

    // Get the WordPress integration
    const { data: integration, error: integrationError } = await supabaseClient
      .from('integrations')
      .select('*')
      .eq('id', integrationId)
      .eq('user_id', user.id)
      .eq('platform', 'wordpress')
      .single();

    if (integrationError || !integration) {
      throw new Error('WordPress integration not found');
    }

    if (!integration.connected) {
      throw new Error('WordPress integration is not connected. Please reconnect your site.');
    }

    const siteUrl = integration.metadata?.site_url;
    if (!siteUrl) {
      throw new Error('Site URL not found in integration metadata');
    }

    // Prepare post data
    const postData: any = {
      title,
      content,
      status, // 'draft' or 'publish'
    };

    if (excerpt) {
      postData.excerpt = excerpt;
    }

    // Handle categories - WordPress expects category IDs
    if (categories && categories.length > 0) {
      // If categories are strings (names), we need to create them or get their IDs
      const categoryIds = [];
      for (const category of categories) {
        if (typeof category === 'number') {
          categoryIds.push(category);
        } else {
          // Try to find or create category
          const catId = await getOrCreateCategory(siteUrl, integration.access_token, category);
          if (catId) categoryIds.push(catId);
        }
      }
      if (categoryIds.length > 0) {
        postData.categories = categoryIds;
      }
    }

    // Handle tags - WordPress expects tag IDs
    if (tags && tags.length > 0) {
      const tagIds = [];
      for (const tag of tags) {
        if (typeof tag === 'number') {
          tagIds.push(tag);
        } else {
          // Try to find or create tag
          const tagId = await getOrCreateTag(siteUrl, integration.access_token, tag);
          if (tagId) tagIds.push(tagId);
        }
      }
      if (tagIds.length > 0) {
        postData.tags = tagIds;
      }
    }

    // Handle featured image
    if (featuredImageUrl) {
      // Upload image to WordPress media library and get its ID
      const mediaId = await uploadFeaturedImage(siteUrl, integration.access_token, featuredImageUrl);
      if (mediaId) {
        postData.featured_media = mediaId;
      }
    }

    // Create or update post
    let wpResponse;
    let endpoint;
    let method;

    if (postId) {
      // Update existing post
      endpoint = `${siteUrl}/wp-json/wp/v2/posts/${postId}`;
      method = 'PUT';
      console.log('Updating WordPress post:', postId);
    } else {
      // Create new post
      endpoint = `${siteUrl}/wp-json/wp/v2/posts`;
      method = 'POST';
      console.log('Creating new WordPress post');
    }

    wpResponse = await fetch(endpoint, {
      method,
      headers: {
        'Authorization': `Basic ${integration.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    });

    if (!wpResponse.ok) {
      const errorText = await wpResponse.text();
      console.error('WordPress API error:', wpResponse.status, errorText);
      throw new Error(`WordPress API error: ${wpResponse.status} - ${errorText}`);
    }

    const publishedPost = await wpResponse.json();
    console.log('Post published successfully:', publishedPost.id);

    // Store in published_posts table for tracking
    const { error: dbError } = await supabaseClient
      .from('published_posts')
      .insert({
        user_id: user.id,
        platform: 'wordpress',
        integration_id: integrationId,
        external_id: publishedPost.id.toString(),
        external_url: publishedPost.link,
        content: content,
        status: status,
        published_at: status === 'publish' ? new Date().toISOString() : null,
      });

    if (dbError) {
      console.error('Error storing published post:', dbError);
      // Don't fail the request, post was published successfully
    }

    return new Response(
      JSON.stringify({
        success: true,
        post: {
          id: publishedPost.id,
          title: publishedPost.title.rendered,
          link: publishedPost.link,
          status: publishedPost.status,
          excerpt: publishedPost.excerpt.rendered,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in publish-to-wordpress:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to get or create category
async function getOrCreateCategory(siteUrl: string, accessToken: string, categoryName: string): Promise<number | null> {
  try {
    // First, try to find existing category
    const searchResponse = await fetch(
      `${siteUrl}/wp-json/wp/v2/categories?search=${encodeURIComponent(categoryName)}`,
      {
        headers: {
          'Authorization': `Basic ${accessToken}`,
        },
      }
    );

    if (searchResponse.ok) {
      const categories = await searchResponse.json();
      const existingCategory = categories.find((cat: any) => 
        cat.name.toLowerCase() === categoryName.toLowerCase()
      );
      
      if (existingCategory) {
        return existingCategory.id;
      }
    }

    // Category doesn't exist, create it
    const createResponse = await fetch(`${siteUrl}/wp-json/wp/v2/categories`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: categoryName }),
    });

    if (createResponse.ok) {
      const newCategory = await createResponse.json();
      return newCategory.id;
    }

    return null;
  } catch (error) {
    console.error('Error getting/creating category:', error);
    return null;
  }
}

// Helper function to get or create tag
async function getOrCreateTag(siteUrl: string, accessToken: string, tagName: string): Promise<number | null> {
  try {
    // First, try to find existing tag
    const searchResponse = await fetch(
      `${siteUrl}/wp-json/wp/v2/tags?search=${encodeURIComponent(tagName)}`,
      {
        headers: {
          'Authorization': `Basic ${accessToken}`,
        },
      }
    );

    if (searchResponse.ok) {
      const tags = await searchResponse.json();
      const existingTag = tags.find((tag: any) => 
        tag.name.toLowerCase() === tagName.toLowerCase()
      );
      
      if (existingTag) {
        return existingTag.id;
      }
    }

    // Tag doesn't exist, create it
    const createResponse = await fetch(`${siteUrl}/wp-json/wp/v2/tags`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: tagName }),
    });

    if (createResponse.ok) {
      const newTag = await createResponse.json();
      return newTag.id;
    }

    return null;
  } catch (error) {
    console.error('Error getting/creating tag:', error);
    return null;
  }
}

// Helper function to upload featured image
async function uploadFeaturedImage(siteUrl: string, accessToken: string, imageUrl: string): Promise<number | null> {
  try {
    // Download the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.error('Failed to download featured image');
      return null;
    }

    const imageBlob = await imageResponse.blob();
    const arrayBuffer = await imageBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Get filename from URL or use default
    const filename = imageUrl.split('/').pop() || 'featured-image.jpg';

    // Upload to WordPress media library
    const uploadResponse = await fetch(`${siteUrl}/wp-json/wp/v2/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${accessToken}`,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': imageBlob.type || 'image/jpeg',
      },
      body: uint8Array,
    });

    if (uploadResponse.ok) {
      const media = await uploadResponse.json();
      return media.id;
    }

    console.error('Failed to upload featured image:', uploadResponse.status);
    return null;
  } catch (error) {
    console.error('Error uploading featured image:', error);
    return null;
  }
}
