import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id?: string;
    from?: string;
    to?: string[] | string;
    subject?: string;
    html?: string;
    text?: string;
    created_at?: string;
    attachments?: any[];
    [key: string]: any;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const event: ResendWebhookEvent = await req.json();
    console.log("Received webhook event:", event.type);

    const eventType = event.type;
    const data = event.data;

    // Determine direction based on event type
    const direction = eventType === "email.received" ? "received" : "sent";

    // Extract email addresses
    const to = Array.isArray(data.to) ? data.to[0] : data.to;
    const from = data.from || "unknown@sender.com";
    
    // Extract actual email address from "Name <email@domain.com>" format
    const fromEmailMatch = from.match(/<([^>]+)>/) || from.match(/([^\s<>]+@[^\s<>]+)/);
    const fromEmail = fromEmailMatch ? fromEmailMatch[1] : from;

    // Determine user_id based on direction
    let userId: string | null = null;

    if (direction === "sent") {
      // For sent emails, try to find user by the sender's domain or system
      // Since all sent emails come from our system, try to find any user
      const { data: users } = await supabase
        .from("user_profiles")
        .select("id")
        .limit(1);
      
      if (users && users.length > 0) {
        userId = users[0].id;
      }
    } else {
      // For received emails, try to find user by matching sender's email
      const { data: authUser } = await supabase.auth.admin.listUsers();
      const user = authUser?.users?.find(u => u.email === fromEmail);
      userId = user?.id || null;
      
      // If no user found, leave it null (for unknown senders)
    }

    // Determine status based on event type
    let status = "sent";
    switch (eventType) {
      case "email.delivered":
        status = "delivered";
        break;
      case "email.bounced":
        status = "bounced";
        break;
      case "email.failed":
        status = "failed";
        break;
      case "email.complained":
        status = "complained";
        break;
      case "email.received":
        status = "received";
        break;
    }

    // Store initial event data
    const emailRecord: any = {
      user_id: userId,
      direction,
      event_type: eventType,
      status,
      recipient_email: to,
      from_name: from,
      from_email: fromEmail,
      subject: data.subject || "(no subject)",
      body: data.text || data.html || "",
      message_html: data.html,
      message_text: data.text,
      provider_message_id: data.email_id,
      resend_email_id: data.email_id,
      pending_body: false,
      raw_event_json: event,
      send_mode: direction === "sent" ? "single" : null,
    };

    // Handle read events
    if (eventType === "email.read") {
      emailRecord.read_at = new Date().toISOString();
    }

    // For received emails, ALWAYS fetch body since webhook doesn't include it
    // For sent emails, only fetch if missing
    const needsBodyFetch = (direction === 'received' || (!data.html && !data.text)) && data.email_id;

    if (needsBodyFetch) {
      emailRecord.pending_body = true;
    }

    // Check if record already exists
    const { data: existingRecord } = await supabase
      .from("email_history")
      .select("id")
      .eq("provider_message_id", data.email_id)
      .single();

    let insertedRecord;
    let insertError;

    if (existingRecord) {
      // Update existing record
      const { data, error } = await supabase
        .from("email_history")
        .update(emailRecord)
        .eq("id", existingRecord.id)
        .select()
        .single();
      
      insertedRecord = data;
      insertError = error;
    } else {
      // Insert new record
      const { data, error } = await supabase
        .from("email_history")
        .insert(emailRecord)
        .select()
        .single();
      
      insertedRecord = data;
      insertError = error;
    }

    if (insertError) {
      console.error("Error inserting email record:", insertError);
      throw insertError;
    }

    console.log("Email record inserted:", insertedRecord.id);

    // Fetch message body if needed (in background)
    if (needsBodyFetch && resendApiKey && data.email_id) {
      console.log("Fetching message body for:", data.email_id, "Direction:", direction);
      
      // Use EdgeRuntime.waitUntil for proper background processing
      const backgroundTask = (async () => {
        try {
          // Wait a bit for Resend to process the email
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Use different endpoints for sent vs received emails
          const apiEndpoint = direction === 'received' 
            ? `https://api.resend.com/emails/receiving/${data.email_id}`
            : `https://api.resend.com/emails/${data.email_id}`;
          
          console.log("Calling Resend API:", apiEndpoint);
          
          const response = await fetch(apiEndpoint, {
            headers: {
              "Authorization": `Bearer ${resendApiKey}`,
            },
          });

          console.log("Resend API response status:", response.status);

          if (response.ok) {
            const messageData = await response.json();
            console.log("Message data received:", { 
              hasHtml: !!messageData.html, 
              hasText: !!messageData.text,
              htmlLength: messageData.html?.length,
              textLength: messageData.text?.length
            });
            
            // Update the record with fetched body
            const { data: updateData, error: updateError } = await supabase
              .from("email_history")
              .update({
                message_html: messageData.html || null,
                message_text: messageData.text || messageData.html || null,
                body: messageData.text || messageData.html || "No content",
                attachments: messageData.attachments || null,
                pending_body: false,
              })
              .eq("id", insertedRecord.id)
              .select();

            if (updateError) {
              console.error("Error updating email record:", updateError);
            } else {
              console.log("Message body fetched and updated for:", insertedRecord.id);
            }
          } else {
            const errorText = await response.text();
            console.error("Failed to fetch message body. Status:", response.status, "Error:", errorText);
            
            // Clear pending flag even on error
            await supabase
              .from("email_history")
              .update({ pending_body: false })
              .eq("id", insertedRecord.id);
          }
        } catch (error) {
          console.error("Error fetching message body:", error);
          // Clear pending flag on error
          try {
            await supabase
              .from("email_history")
              .update({ pending_body: false })
              .eq("id", insertedRecord.id);
          } catch (cleanupError) {
            console.error("Error clearing pending flag:", cleanupError);
          }
        }
      })();

      // Use background processing (best effort)
      if (typeof (globalThis as any).EdgeRuntime !== 'undefined') {
        (globalThis as any).EdgeRuntime.waitUntil(backgroundTask);
      } else {
        // Fallback for local development
        backgroundTask.catch(err => console.error("Background task error:", err));
      }
    }

    // Trigger auto-reply for received emails (in background)
    if (direction === 'received' && insertedRecord?.id) {
      const autoReplyTask = (async () => {
        try {
          console.log("Triggering auto-reply for email:", insertedRecord.id);
          await supabase.functions.invoke("auto-reply-email", {
            body: { emailId: insertedRecord.id },
          });
        } catch (error) {
          console.error("Auto-reply trigger error:", error);
        }
      })();

      if (typeof (globalThis as any).EdgeRuntime !== 'undefined') {
        (globalThis as any).EdgeRuntime.waitUntil(autoReplyTask);
      } else {
        autoReplyTask.catch(err => console.error("Auto-reply background task error:", err));
      }
    }

    return new Response(
      JSON.stringify({ success: true, recordId: insertedRecord.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
