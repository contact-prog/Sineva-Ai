import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();
    console.log("Processing scheduled emails at:", now);

    // Fetch emails that are scheduled and due to be sent
    const { data: scheduledEmails, error: fetchError } = await supabase
      .from("email_history")
      .select("*")
      .eq("status", "scheduled")
      .eq("send_mode", "scheduled")
      .lte("scheduled_for", now)
      .order("scheduled_for", { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error("Error fetching scheduled emails:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${scheduledEmails?.length || 0} scheduled emails to process at ${now}`);

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const email of scheduledEmails || []) {
      try {
        console.log(`Processing email ${email.id} for user ${email.user_id}`);
        results.processed++;

        // Mark as sending first to prevent duplicate processing
        await supabase
          .from("email_history")
          .update({ status: "sending" })
          .eq("id", email.id);

        // Get user's connected email account
        const { data: emailAccount, error: accountError } = await supabase
          .from("social_accounts")
          .select("*")
          .eq("user_id", email.user_id)
          .in("platform", ["gmail", "outlook"])
          .eq("is_active", true)
          .maybeSingle();

        if (accountError || !emailAccount) {
          console.error(`No email account found for user ${email.user_id}`);
          await supabase
            .from("email_history")
            .update({
              status: "failed",
              error_message: "No email account connected"
            })
            .eq("id", email.id);
          results.failed++;
          results.errors.push(`Email ${email.id}: No email account connected`);
          continue;
        }

        console.log(`Using ${emailAccount.platform} account for email ${email.id}`);

        // Parse recipients
        const recipients = email.recipient_email.split(',').map((e: string) => e.trim());
        const ccRecipients = email.cc_emails || [];

        // Prepare email payload with user_id
        const emailPayload = {
          to: recipients,
          cc: ccRecipients,
          subject: email.subject,
          body: email.body,
          attachments: email.attachments || [],
          user_id: email.user_id // Pass user_id for background processing
        };

        // Call appropriate send function based on platform
        const functionName = emailAccount.platform === "gmail" ? "send-gmail" : "send-outlook";
        
        const { data: sendResult, error: sendError } = await supabase.functions.invoke(
          functionName,
          {
            body: emailPayload,
            headers: {
              Authorization: `Bearer ${supabaseServiceKey}`
            }
          }
        );

        if (sendError || !sendResult?.success) {
          console.error(`Failed to send email ${email.id}:`, sendError || sendResult);
          await supabase
            .from("email_history")
            .update({
              status: "failed",
              error_message: sendError?.message || sendResult?.error || "Failed to send email"
            })
            .eq("id", email.id);
          results.failed++;
          results.errors.push(`Email ${email.id}: ${sendError?.message || sendResult?.error || "Send failed"}`);
        } else {
          console.log(`Successfully sent email ${email.id}`);
          await supabase
            .from("email_history")
            .update({
              status: "sent",
              error_message: null
            })
            .eq("id", email.id);
          results.sent++;
        }
      } catch (emailError: any) {
        console.error(`Error processing email ${email.id}:`, emailError);
        await supabase
          .from("email_history")
          .update({
            status: "failed",
            error_message: emailError.message || "Processing error"
          })
          .eq("id", email.id);
        results.failed++;
        results.errors.push(`Email ${email.id}: ${emailError.message}`);
      }
    }

    console.log("Processing complete:", results);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Scheduled emails processed",
        results
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error: any) {
    console.error("Error in process-scheduled-emails:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to process scheduled emails"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
