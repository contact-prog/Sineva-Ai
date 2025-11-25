import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GetMessagesRequest {
  folder?: 'inbox' | 'sent';
  maxResults?: number;
  pageToken?: string;
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

    // Get Gmail account
    const { data: gmailAccount, error: accountError } = await supabase
      .from("social_accounts")
      .select("access_token, refresh_token, token_expires_at, id")
      .eq("user_id", user.id)
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

    // Refresh token if expired
    let accessToken = gmailAccount.access_token;
    const now = new Date();
    const expiresAt = gmailAccount.token_expires_at ? new Date(gmailAccount.token_expires_at) : null;

    if (!expiresAt || now >= expiresAt) {
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
        throw new Error("Failed to refresh Gmail token");
      }

      const tokenData = await tokenResponse.json();
      accessToken = tokenData.access_token;

      await supabase
        .from("social_accounts")
        .update({
          access_token: accessToken,
          token_expires_at: new Date(now.getTime() + tokenData.expires_in * 1000).toISOString(),
        })
        .eq("id", gmailAccount.id);
    }

    const { folder = 'inbox', maxResults = 50, pageToken }: GetMessagesRequest = await req.json();

    // Build query based on folder
    let query = '';
    if (folder === 'sent') {
      query = 'in:sent';
    } else {
      query = 'in:inbox';
    }

    // Build URL with pagination support
    let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent(query)}`;
    if (pageToken) {
      url += `&pageToken=${pageToken}`;
    }

    // Get message list
    const listResponse = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!listResponse.ok) {
      const error = await listResponse.json();
      throw new Error(error.error?.message || "Failed to fetch messages");
    }

    const listData = await listResponse.json();
    
    if (!listData.messages || listData.messages.length === 0) {
      return new Response(
        JSON.stringify({ messages: [] }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Fetch full details for each message
    const messages = await Promise.all(
      listData.messages.map(async (msg: any) => {
        const msgResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!msgResponse.ok) return null;
        
        const msgData = await msgResponse.json();
        
        // Extract headers
        const headers = msgData.payload.headers;
        const from = headers.find((h: any) => h.name === "From")?.value || "";
        const to = headers.find((h: any) => h.name === "To")?.value || "";
        const subject = headers.find((h: any) => h.name === "Subject")?.value || "(No Subject)";
        const date = headers.find((h: any) => h.name === "Date")?.value || "";
        const messageId = headers.find((h: any) => h.name === "Message-ID" || h.name === "Message-Id")?.value || "";
        const references = headers.find((h: any) => h.name === "References")?.value || "";
        const inReplyTo = headers.find((h: any) => h.name === "In-Reply-To")?.value || "";
        
        // Extract body
        let body = "";
        if (msgData.payload.body?.data) {
          body = atob(msgData.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        } else if (msgData.payload.parts) {
          const textPart = msgData.payload.parts.find((p: any) => p.mimeType === "text/plain");
          if (textPart?.body?.data) {
            body = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          }
        }
        
        return {
          id: msgData.id,
          threadId: msgData.threadId,
          from,
          to,
          subject,
          snippet: msgData.snippet,
          body: body.substring(0, 500), // First 500 chars
          date,
          timestamp: msgData.internalDate,
          labels: msgData.labelIds || [],
          unread: msgData.labelIds?.includes("UNREAD") || false,
          messageId, // Add Message-ID for threading
          references, // Add References for threading
          inReplyTo, // Add In-Reply-To for threading
        };
      })
    );

    const filteredMessages = messages.filter(m => m !== null);

    return new Response(
      JSON.stringify({ 
        messages: filteredMessages, 
        total: listData.resultSizeEstimate,
        nextPageToken: listData.nextPageToken // For pagination
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in get-gmail-messages:", error);
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
