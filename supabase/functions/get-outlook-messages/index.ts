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
  skipToken?: string;
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

    // Get Outlook account
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

    // Refresh token if expired
    let accessToken = outlookAccount.access_token;
    const now = new Date();
    const expiresAt = outlookAccount.token_expires_at ? new Date(outlookAccount.token_expires_at) : null;

    if (!expiresAt || now >= expiresAt) {
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
        throw new Error("Failed to refresh Outlook token");
      }

      const tokenData = await tokenResponse.json();
      accessToken = tokenData.access_token;

      await supabase
        .from("social_accounts")
        .update({
          access_token: accessToken,
          token_expires_at: new Date(now.getTime() + tokenData.expires_in * 1000).toISOString(),
        })
        .eq("id", outlookAccount.id);
    }

    const { folder = 'inbox', maxResults = 50, skipToken }: GetMessagesRequest = await req.json();

    // Build URL based on folder - Microsoft Graph API
    let url = '';
    if (folder === 'sent') {
      url = `https://graph.microsoft.com/v1.0/me/mailFolders/sentitems/messages?$top=${maxResults}&$select=id,subject,bodyPreview,from,toRecipients,receivedDateTime,isRead,conversationId,internetMessageId,internetMessageHeaders`;
    } else {
      url = `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=${maxResults}&$select=id,subject,bodyPreview,from,toRecipients,receivedDateTime,isRead,conversationId,internetMessageId,internetMessageHeaders`;
    }

    // Add pagination token if provided
    if (skipToken) {
      url += `&$skiptoken=${skipToken}`;
    }

    // Get message list
    const listResponse = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!listResponse.ok) {
      const error = await listResponse.json();
      console.error("Outlook API error:", error);
      throw new Error(error.error?.message || "Failed to fetch messages from Outlook");
    }

    const listData = await listResponse.json();
    
    if (!listData.value || listData.value.length === 0) {
      return new Response(
        JSON.stringify({ messages: [] }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Transform Outlook messages to match Gmail format
    const messages = listData.value.map((msg: any) => {
      const fromEmail = msg.from?.emailAddress?.address || "";
      const fromName = msg.from?.emailAddress?.name || fromEmail;
      const toEmails = msg.toRecipients?.map((r: any) => r.emailAddress?.address).join(", ") || "";
      
      // Extract Message-ID and References from internet headers
      const headers = msg.internetMessageHeaders || [];
      const messageIdHeader = headers.find((h: any) => h.name === "Message-ID" || h.name === "Message-Id");
      const referencesHeader = headers.find((h: any) => h.name === "References");
      const inReplyToHeader = headers.find((h: any) => h.name === "In-Reply-To");
      
      return {
        id: msg.id,
        threadId: msg.conversationId,
        from: fromName ? `${fromName} <${fromEmail}>` : fromEmail,
        to: toEmails,
        subject: msg.subject || "(No Subject)",
        snippet: msg.bodyPreview || "",
        body: msg.bodyPreview || "",
        date: new Date(msg.receivedDateTime).toUTCString(),
        timestamp: new Date(msg.receivedDateTime).getTime().toString(),
        labels: [],
        unread: !msg.isRead,
        messageId: msg.internetMessageId || messageIdHeader?.value || "",
        references: referencesHeader?.value || "",
        inReplyTo: inReplyToHeader?.value || "",
      };
    });

    // Extract skip token from @odata.nextLink if present
    let nextSkipToken = null;
    if (listData['@odata.nextLink']) {
      const nextUrl = new URL(listData['@odata.nextLink']);
      nextSkipToken = nextUrl.searchParams.get('$skiptoken');
    }

    return new Response(
      JSON.stringify({ 
        messages, 
        total: messages.length,
        nextPageToken: nextSkipToken // For pagination
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in get-outlook-messages:", error);
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
