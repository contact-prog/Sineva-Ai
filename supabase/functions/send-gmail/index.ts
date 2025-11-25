import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to encode Unicode strings to base64url
function base64urlEncode(str: string): string {
  // Convert string to UTF-8 bytes
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  
  // Convert bytes to base64
  const base64 = btoa(String.fromCharCode(...data));
  
  // Convert to base64url format
  return base64
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

interface SendGmailRequest {
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  attachments?: Array<{ filename: string; content: string; mimeType?: string }>;
  user_id?: string; // Optional user_id for background processing
  inReplyTo?: string; // Message-ID of the email being replied to
  references?: string; // Space-separated list of Message-IDs in the thread
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    // Create Supabase client with service role key for admin operations
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body first to check for user_id
    const requestBody: SendGmailRequest = await req.json();
    
    // Determine user ID - either from JWT or from request body
    let userId: string;
    
    if (requestBody.user_id) {
      // Background processing mode - use provided user_id with service role
      userId = requestBody.user_id;
      console.log("Using provided user_id for background processing:", userId);
    } else {
      // Normal user request mode - authenticate via JWT
      const userClient = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      userId = user.id;
    }

    // Get Gmail account from social_accounts using the determined user_id
    const { data: gmailAccount, error: accountError } = await supabase
      .from("social_accounts")
      .select("access_token, refresh_token, token_expires_at, id")
      .eq("user_id", userId)
      .eq("platform", "gmail")
      .eq("is_active", true)
      .single();

    if (accountError || !gmailAccount) {
      return new Response(
        JSON.stringify({ error: "Gmail account not connected" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if token is expired and refresh if needed
    let accessToken = gmailAccount.access_token;
    const now = new Date();
    const expiresAt = gmailAccount.token_expires_at ? new Date(gmailAccount.token_expires_at) : null;

    if (!expiresAt || now >= expiresAt) {
      console.log("Access token expired, refreshing...");
      
      // Refresh the token
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
          client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
          refresh_token: gmailAccount.refresh_token!,
          grant_type: "refresh_token",
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.json();
        console.error("Token refresh failed:", error);
        throw new Error("Failed to refresh Gmail token. Please reconnect your account.");
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
        .eq("id", gmailAccount.id);

      console.log("Token refreshed successfully");
    }

    const { to, cc, subject, body, attachments, inReplyTo, references } = requestBody;

    if (!to || to.length === 0 || !subject || !body) {
      return new Response(
        JSON.stringify({ error: "To, subject and body are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create email in RFC 2822 format
    const boundary = "----=_Part_" + Date.now();
    let email = [
      `To: ${to.join(", ")}`,
      cc && cc.length > 0 ? `Cc: ${cc.join(", ")}` : null,
      `Subject: ${subject}`,
      inReplyTo ? `In-Reply-To: ${inReplyTo}` : null,
      references ? `References: ${references}` : null,
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      "Content-Type: text/html; charset=UTF-8",
      "",
      body.replace(/\n/g, '<br>'),
      ""
    ].filter(line => line !== null).join("\r\n");

    // Add attachments if any
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        email += `--${boundary}\r\n`;
        email += `Content-Type: ${attachment.mimeType || "application/octet-stream"}; name="${attachment.filename}"\r\n`;
        email += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n`;
        email += `Content-Transfer-Encoding: base64\r\n\r\n`;
        email += `${attachment.content}\r\n\r\n`;
      }
    }

    email += `--${boundary}--`;

    // Encode email in base64url format (properly handles Unicode)
    const encodedEmail = base64urlEncode(email);

    // Send via Gmail API
    console.log("Sending email via Gmail API...");
    console.log("Recipients:", to);
    console.log("Subject:", subject);
    console.log("Has attachments:", attachments && attachments.length > 0);
    
    const gmailResponse = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          raw: encodedEmail,
        }),
      }
    );

    if (!gmailResponse.ok) {
      const errorData = await gmailResponse.json();
      console.error("Gmail API error:", errorData);
      console.error("Status:", gmailResponse.status);
      console.error("Status text:", gmailResponse.statusText);
      throw new Error(errorData.error?.message || "Failed to send email via Gmail");
    }

    const result = await gmailResponse.json();
    console.log("Email sent successfully via Gmail:", result);
    
    // Log email details for debugging
    console.log("Email sent to:", to);
    console.log("Subject:", subject);
    console.log("CC:", cc || "none");

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.id,
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
    console.error("Error in send-gmail function:", error);
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
