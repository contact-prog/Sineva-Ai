import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      console.error("OAuth error:", error);
      const defaultUrl = "https://sineva.ai/app/email-generator";
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${defaultUrl}?error=${error}`,
        },
      });
    }

    if (!code || !state) {
      throw new Error("Missing code or state parameter");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    console.log("Verifying state:", state);

    // Verify state - look for pending record
    const { data: pendingAuth, error: stateError } = await supabaseAdmin
      .from("social_accounts")
      .select("id, user_id, metadata")
      .eq("platform", "outlook")
      .eq("account_id", `pending_${state}`)
      .single();

    console.log("State lookup result:", { found: !!pendingAuth, error: stateError?.message });

    if (stateError || !pendingAuth) {
      console.error("State verification failed:", { stateError, state });
      throw new Error("Invalid state parameter - OAuth session may have expired");
    }

    console.log("State verified for user:", pendingAuth.user_id);

    // Exchange code for tokens
    const clientId = Deno.env.get("MICROSOFT_CLIENT_ID");
    const clientSecret = Deno.env.get("MICROSOFT_CLIENT_SECRET");
    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/outlook-auth-callback`;

    const tokenResponse = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Token exchange error:", tokens);
      throw new Error(tokens.error_description || "Failed to exchange code for tokens");
    }

    // Try to get user profile from Microsoft Graph API, but treat failures as non-fatal
    let profile: any = null;
    let profileEmail: string | null = null;
    let profileName: string | null = null;

    try {
      const profileResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      const profileJson = await profileResponse.json();

      if (!profileResponse.ok) {
        console.error("Profile fetch error:", profileJson);
      } else {
        profile = profileJson;
      }
    } catch (profileError) {
      console.error("Profile fetch threw error (non-fatal):", profileError);
    }

    // Fallback: try to extract basic profile info from the ID token if Graph fails
    const idToken = tokens.id_token;
    if (idToken && typeof idToken === "string") {
      try {
        const [, payloadB64] = idToken.split(".");
        const padded = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
        const payloadJson = JSON.parse(atob(padded));
        profileEmail = payloadJson.email || payloadJson.preferred_username || payloadJson.upn || null;
        profileName = payloadJson.name || null;
      } catch (e) {
        console.error("Failed to parse id_token for Outlook profile:", e);
      }
    }

    const accountEmail =
      profile?.userPrincipalName ||
      profile?.mail ||
      profileEmail ||
      null;

    const accountName =
      profile?.displayName ||
      profileName ||
      accountEmail ||
      "Outlook account";

    if (!accountEmail) {
      console.warn("Could not determine Outlook email from Graph or id_token; proceeding with generic account");
    }

    // Calculate token expiry
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (tokens.expires_in || 3600));

    // Delete the pending state record
    const { error: deleteError } = await supabaseAdmin.from("social_accounts").delete().eq("id", pendingAuth.id);

    if (deleteError) {
      console.error("Failed to delete pending record:", deleteError);
    }

    // Store tokens in database
    const { error: insertError } = await supabaseAdmin.from("social_accounts").insert({
      user_id: pendingAuth.user_id,
      platform: "outlook",
      account_id: accountEmail || `outlook_${profile?.id || pendingAuth.user_id}`,
      account_name: accountName,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      token_expires_at: expiresAt.toISOString(),
      is_active: true,
      metadata: {
        email: accountEmail,
        displayName: accountName,
        scopes: tokens.scope,
        userId: profile?.id || null,
        source: profile ? "graph_me" : "id_token_or_fallback",
      },
    });

    if (insertError) {
      console.error("Failed to store Outlook connection:", insertError);
      throw new Error(`Failed to save connection: ${insertError.message}`);
    }

    console.log("Outlook connected successfully for user:", pendingAuth.user_id);

    // Redirect back to where user came from
    const returnUrl =
      pendingAuth.metadata?.returnUrl || "https://sineva.ai/app/email-generator";
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${returnUrl}?connected=outlook`,
      },
    });
  } catch (error) {
    console.error("Error in outlook-auth-callback:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const defaultUrl = "https://sineva.ai/app/email-generator";
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${defaultUrl}?error=${encodeURIComponent(errorMessage)}`,
      },
    });
  }
});
