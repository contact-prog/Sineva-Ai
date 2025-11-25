import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { generateVertexAuthToken, getVertexProjectId } from "../_shared/vertex-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY");

const resend = new Resend(resendApiKey);

interface AutoReplyRequest {
  emailId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { emailId }: AutoReplyRequest = await req.json();
    console.log("Auto-reply triggered for email:", emailId);

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the received email
    const { data: email, error: emailError } = await supabase
      .from("email_history")
      .select("*")
      .eq("id", emailId)
      .eq("direction", "received")
      .single();

    if (emailError || !email) {
      console.error("Email not found:", emailError);
      return new Response(
        JSON.stringify({ error: "Email not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already replied
    if (email.auto_reply_done) {
      console.log("Already replied to this email");
      return new Response(
        JSON.stringify({ success: true, message: "Already replied" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has auto-reply enabled
    const { data: settings } = await supabase
      .from("user_settings")
      .select("auto_reply_enabled")
      .eq("user_id", email.user_id)
      .single();

    if (!settings?.auto_reply_enabled) {
      console.log("Auto-reply disabled for user");
      return new Response(
        JSON.stringify({ success: true, message: "Auto-reply disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate reply using Vertex AI
    console.log("Generating auto-reply with Vertex AI...");
    const projectId = getVertexProjectId();
    const token = await generateVertexAuthToken();
    
    const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent`;

    const aiResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [{
            text: `You are a professional email assistant. Generate a polite, professional auto-reply to this email. Keep it concise and helpful. Do not include greetings like 'Dear' or sign-offs, just the message body.

Subject: ${email.subject}
Body: ${email.body || email.message_text || "No content"}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500
        }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Vertex AI generation failed:", errorText);
      throw new Error(`AI generation failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const replyBody = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "Thank you for your email. I'll get back to you soon.";

    console.log("Generated reply:", replyBody);

    // Send the reply email using Resend directly
    const emailResponse = await resend.emails.send({
      from: "Sineva AI Auto-Reply <support@mail.7lakh.com>",
      to: [email.from_email],
      subject: `Re: ${email.subject}`,
      html: replyBody.replace(/\n/g, '<br>'),
    });

    if (emailResponse.error) {
      console.error("Failed to send reply:", emailResponse.error);
      throw new Error(`Failed to send reply: ${emailResponse.error.message}`);
    }

    console.log("Reply sent successfully:", emailResponse);

    // Mark original email as replied
    await supabase
      .from("email_history")
      .update({ auto_reply_done: true })
      .eq("id", emailId);

    console.log("Marked email as replied");

    return new Response(
      JSON.stringify({ success: true, reply: replyBody }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in auto-reply function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
