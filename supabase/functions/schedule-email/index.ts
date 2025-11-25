import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { authenticateRequest } from "../_shared/auth-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, body, cc, scheduledFor, timezone } = await req.json();

    console.log("Scheduling email:", { to, subject, scheduledFor, timezone });

    // Authenticate request
    const { userId, supabase, error: authError } = await authenticateRequest(req);
    if (authError) {
      console.error('Authentication failed:', authError);
      throw new Error('Unauthorized');
    }

    // Validate inputs
    if (!to || !Array.isArray(to) || to.length === 0) {
      throw new Error('Recipient email(s) required');
    }

    if (!subject || !body) {
      throw new Error('Subject and body are required');
    }

    if (!scheduledFor) {
      throw new Error('Scheduled datetime is required');
    }

    // Parse scheduled datetime
    const scheduledDate = new Date(scheduledFor);
    if (isNaN(scheduledDate.getTime())) {
      throw new Error('Invalid scheduled datetime format. Use ISO 8601 format.');
    }

    // Ensure scheduled time is in the future
    if (scheduledDate <= new Date()) {
      throw new Error('Scheduled time must be in the future');
    }

    // Get user's connected email account
    const { data: emailAccount, error: accountError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId)
      .in('platform', ['gmail', 'outlook'])
      .eq('is_active', true)
      .maybeSingle();

    if (accountError) {
      console.error('Error checking email account:', accountError);
      throw new Error('Failed to verify email account connection');
    }

    if (!emailAccount) {
      throw new Error('No email account connected. Please connect Gmail or Outlook first.');
    }

    console.log('Email account found:', emailAccount.platform);

    // Store scheduled email in database (using email_history table with scheduled status)
    const { data: scheduledEmail, error: insertError } = await supabase
      .from('email_history')
      .insert({
        user_id: userId,
        recipient_email: to.join(', '),
        cc_emails: cc || [],
        subject,
        body,
        status: 'scheduled',
        direction: 'sent',
        send_mode: 'scheduled',
        scheduled_for: scheduledDate.toISOString()
      })
      .select()
      .maybeSingle();

    if (insertError) {
      console.error('Error inserting scheduled email:', insertError);
      throw insertError;
    }

    console.log('Email scheduled successfully:', scheduledEmail.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email scheduled successfully for ${scheduledDate.toLocaleString('en-US', { 
          dateStyle: 'full', 
          timeStyle: 'short',
          timeZone: timezone || 'UTC'
        })}`,
        scheduledId: scheduledEmail.id,
        scheduledFor: scheduledDate.toISOString(),
        recipientCount: to.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in schedule-email:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || "Failed to schedule email" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
