import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendOutlookRequest {
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  attachments?: Array<{ filename: string; content: string; mimeType?: string }>;
  inReplyTo?: string; // Message-ID of the email being replied to
  conversationId?: string; // Conversation ID for threading
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get Outlook account from social_accounts
    const { data: outlookAccount, error: accountError } = await supabase
      .from("social_accounts")
      .select("access_token, refresh_token, token_expires_at, id")
      .eq("user_id", user.id)
      .eq("platform", "outlook")
      .eq("is_active", true)
      .single();

    if (accountError || !outlookAccount) {
      return new Response(
        JSON.stringify({ error: "Outlook account not connected" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if token is expired and refresh if needed
    let accessToken = outlookAccount.access_token;
    const now = new Date();
    const expiresAt = outlookAccount.token_expires_at ? new Date(outlookAccount.token_expires_at) : null;

    if (!expiresAt || now >= expiresAt) {
      console.log("Access token expired, refreshing...");
      
      // Refresh the token
      const tokenResponse = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: Deno.env.get("MICROSOFT_CLIENT_ID")!,
          client_secret: Deno.env.get("MICROSOFT_CLIENT_SECRET")!,
          refresh_token: outlookAccount.refresh_token!,
          grant_type: "refresh_token",
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.json();
        console.error("Token refresh failed:", error);
        throw new Error("Failed to refresh Outlook token. Please reconnect your account.");
      }

      const tokenData = await tokenResponse.json();
      accessToken = tokenData.access_token;

      // Update token in database
      const newExpiresAt = new Date(now.getTime() + tokenData.expires_in * 1000);
      await supabase
        .from("social_accounts")
        .update({
          access_token: accessToken,
          token_expires_at: newExpiresAt.toISOString(),
        })
        .eq("id", outlookAccount.id);

      console.log("Token refreshed successfully");
    }

    const { to, cc, subject, body, attachments, inReplyTo, conversationId }: SendOutlookRequest = await req.json();

    if (!to || to.length === 0 || !subject || !body) {
      return new Response(
        JSON.stringify({ error: "To, subject and body are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Build email message using Microsoft Graph API format
    const emailMessage: any = {
      message: {
        subject: subject,
        body: {
          contentType: "HTML",
          content: body.replace(/\n/g, '<br>'),
        },
        toRecipients: to.map(email => ({
          emailAddress: { address: email }
        })),
      },
      saveToSentItems: "true"
    };

    // Add threading headers if replying
    if (inReplyTo) {
      emailMessage.message.internetMessageHeaders = [
        {
          name: "In-Reply-To",
          value: inReplyTo
        }
      ];
    }

    if (conversationId) {
      emailMessage.message.conversationId = conversationId;
    }

    // Add CC recipients if provided
    if (cc && cc.length > 0) {
      emailMessage.message.ccRecipients = cc.map(email => ({
        emailAddress: { address: email }
      }));
    }

    // Add attachments if any
    if (attachments && attachments.length > 0) {
      emailMessage.message.attachments = attachments.map(att => ({
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: att.filename,
        contentType: att.mimeType || "application/octet-stream",
        contentBytes: att.content,
      }));
    }

    // Send via Microsoft Graph API
    console.log("Sending email via Microsoft Graph API...");
    console.log("Recipients:", to);
    console.log("Subject:", subject);
    console.log("Has attachments:", attachments && attachments.length > 0);
    
    const graphResponse = await fetch(
      "https://graph.microsoft.com/v1.0/me/sendMail",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailMessage),
      }
    );

    if (!graphResponse.ok) {
      const errorData = await graphResponse.json();
      console.error("Microsoft Graph API error:", errorData);
      console.error("Status:", graphResponse.status);
      console.error("Status text:", graphResponse.statusText);
      throw new Error(errorData.error?.message || "Failed to send email via Outlook");
    }

    console.log("Email sent successfully via Outlook");
    console.log("Email sent to:", to);
    console.log("Subject:", subject);
    console.log("CC:", cc || "none");

    return new Response(
      JSON.stringify({
        success: true,
        recipients: to,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-outlook function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
