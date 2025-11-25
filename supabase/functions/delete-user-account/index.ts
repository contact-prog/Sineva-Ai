import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      console.error('Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Decode JWT payload (Supabase has already verified this token because verify_jwt = true)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.sub as string | undefined;

    if (!userId) {
      console.error('No user id (sub) in JWT payload');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Deleting account for user:', userId);

    // Create admin client with service role key for deletion operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Delete all user-specific data from tables (in dependency order)
    console.log('Deleting user data from database tables...');
    
    // Delete dependent records first
    const tables = [
      'chat_messages',           // Depends on conversations
      'content_variations',      // Depends on content_history
      'video_story_scenes',      // Depends on video_generations
      'workflow_steps',          // Depends on workflow_executions
      'published_posts',         // Links to multiple tables
      'workflow_executions',
      'conversations',
      'ai_model_usage',
      'blogs',
      'brand_assets',
      'content_history',
      'email_history',
      'graphic_generations',
      'integrations',
      'posting_queue',
      'scraping_jobs',
      'social_accounts',
      'social_posts',
      'usage_tracking',
      'user_memory',
      'user_settings',
      'user_subscriptions',
      'video_generations',
      'videos',
      'user_profiles',
      'profiles'
    ];

    for (const table of tables) {
      try {
        const { error } = await supabaseAdmin
          .from(table)
          .delete()
          .eq('user_id', userId);
        
        if (error) {
          console.error(`Error deleting from ${table}:`, error);
        } else {
          console.log(`Deleted data from ${table}`);
        }
      } catch (error) {
        console.error(`Error processing table ${table}:`, error);
      }
    }

    // Delete user_profiles and profiles by id (not user_id)
    try {
      await supabaseAdmin.from('user_profiles').delete().eq('id', userId);
      console.log('Deleted user_profiles');
    } catch (error) {
      console.error('Error deleting user_profiles:', error);
    }

    try {
      await supabaseAdmin.from('profiles').delete().eq('id', userId);
      console.log('Deleted profiles');
    } catch (error) {
      console.error('Error deleting profiles:', error);
    }

    // Delete all user files from storage buckets
    console.log('Deleting user files from storage...');
    const buckets = ['logos', 'videos', 'final-videos', 'video-clips', 'brand-assets', 'social-media', 'user-uploads'];
    
    for (const bucket of buckets) {
      try {
        const { data: files, error: listError } = await supabaseAdmin
          .storage
          .from(bucket)
          .list(userId);

        if (!listError && files && files.length > 0) {
          const filePaths = files.map(file => `${userId}/${file.name}`);
          const { error: deleteError } = await supabaseAdmin
            .storage
            .from(bucket)
            .remove(filePaths);
          
          if (deleteError) {
            console.error(`Error deleting files from ${bucket}:`, deleteError);
          } else {
            console.log(`Deleted ${files.length} files from ${bucket}`);
          }
        }
      } catch (error) {
        console.error(`Error processing bucket ${bucket}:`, error);
      }
    }

    // Finally, delete the user from auth.users
    console.log('Deleting user from auth.users...');
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      throw new Error(`Failed to delete user: ${deleteError.message}`);
    }

    console.log('Account successfully deleted for user:', userId);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Account and all associated data deleted successfully'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in delete-user-account function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete account';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error instanceof Error ? error.stack : String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
