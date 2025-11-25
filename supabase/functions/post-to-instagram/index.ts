import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PostRequest {
  accountId: string;
  content: string;
  mediaUrls: string[];
  mediaType?: 'image' | 'video' | 'carousel';
  isCarousel?: boolean;
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

    const { accountId, content, mediaUrls, mediaType = 'image', isCarousel }: PostRequest = await req.json();
    console.log('Posting to Instagram for account:', accountId);

    if (!mediaUrls || mediaUrls.length === 0) {
      throw new Error('Instagram posts require at least one media file');
    }

    // Get account details
    const { data: account, error: accountError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      throw new Error('Account not found');
    }

    if (account.platform !== 'instagram') {
      throw new Error('Invalid platform for this endpoint');
    }

    // Check if token is expired
    if (account.token_expires_at && new Date(account.token_expires_at) < new Date()) {
      throw new Error('Access token expired. Please reconnect your account.');
    }

    let containerId: string;

    // Step 1: Create media container
    if (isCarousel && mediaUrls.length > 1) {
      // Carousel post (2-10 items)
      console.log('Creating Instagram carousel with', mediaUrls.length, 'items');
      
      if (mediaUrls.length > 10) {
        throw new Error('Instagram carousels support maximum 10 items');
      }

      const childIds = [];
      
      for (const mediaUrl of mediaUrls) {
        const itemMediaType = mediaUrl.toLowerCase().match(/\.(mp4|mov)$/) ? 'VIDEO' : 'IMAGE';
        const createUrl = `https://graph.facebook.com/v18.0/${account.account_id}/media`;
        const createData = {
          [itemMediaType === 'VIDEO' ? 'video_url' : 'image_url']: mediaUrl,
          is_carousel_item: true,
          access_token: account.access_token
        };

        const createResponse = await fetch(createUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createData)
        });

        const createResult = await createResponse.json();
        if (!createResponse.ok || createResult.error) {
          throw new Error(createResult.error?.message || 'Failed to create carousel item');
        }

        childIds.push(createResult.id);
      }

      // Create carousel container
      const carouselUrl = `https://graph.facebook.com/v18.0/${account.account_id}/media`;
      const carouselData = {
        media_type: 'CAROUSEL',
        children: childIds,
        caption: content,
        access_token: account.access_token
      };

      const carouselResponse = await fetch(carouselUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(carouselData)
      });

      const carouselResult = await carouselResponse.json();
      if (!carouselResponse.ok || carouselResult.error) {
        throw new Error(carouselResult.error?.message || 'Failed to create carousel container');
      }

      containerId = carouselResult.id;
    } else if (mediaUrls.length === 1) {
      // Single media post
      const createUrl = `https://graph.facebook.com/v18.0/${account.account_id}/media`;
      const createData: any = {
        image_url: mediaType === 'image' ? mediaUrls[0] : undefined,
        video_url: mediaType === 'video' ? mediaUrls[0] : undefined,
        caption: content,
        access_token: account.access_token
      };

      const createResponse = await fetch(createUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createData)
      });

      const createResult = await createResponse.json();
      if (!createResponse.ok || createResult.error) {
        throw new Error(createResult.error?.message || 'Failed to create Instagram media container');
      }

      containerId = createResult.id;
    } else {
      // Carousel post
      const childIds = [];
      
      for (const mediaUrl of mediaUrls) {
        const createUrl = `https://graph.facebook.com/v18.0/${account.account_id}/media`;
        const createData = {
          image_url: mediaUrl,
          is_carousel_item: true,
          access_token: account.access_token
        };

        const createResponse = await fetch(createUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createData)
        });

        const createResult = await createResponse.json();
        if (!createResponse.ok || createResult.error) {
          throw new Error(createResult.error?.message || 'Failed to create carousel item');
        }

        childIds.push(createResult.id);
      }

      // Create carousel container
      const carouselUrl = `https://graph.facebook.com/v18.0/${account.account_id}/media`;
      const carouselData = {
        media_type: 'CAROUSEL',
        children: childIds,
        caption: content,
        access_token: account.access_token
      };

      const carouselResponse = await fetch(carouselUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(carouselData)
      });

      const carouselResult = await carouselResponse.json();
      if (!carouselResponse.ok || carouselResult.error) {
        throw new Error(carouselResult.error?.message || 'Failed to create carousel container');
      }

      containerId = carouselResult.id;
    }

    // Step 2: Publish the media container
    const publishUrl = `https://graph.facebook.com/v18.0/${account.account_id}/media_publish`;
    const publishData = {
      creation_id: containerId,
      access_token: account.access_token
    };

    const publishResponse = await fetch(publishUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(publishData)
    });

    const publishResult = await publishResponse.json();
    if (!publishResponse.ok || publishResult.error) {
      throw new Error(publishResult.error?.message || 'Failed to publish Instagram media');
    }

    const platformPostId = publishResult.id;
    console.log('Successfully posted to Instagram:', platformPostId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        platformPostId,
        platform: 'instagram'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in post-to-instagram:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error?.message || 'Unknown error',
        platform: 'instagram'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
