import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  mode: 'single' | 'bulk';
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  fromName?: string;
  attachments?: Array<{ filename: string; content: string }>;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
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

    const { mode, to, cc, subject, body, fromName, attachments }: SendEmailRequest = await req.json();

    if (!to || to.length === 0) {
      return new Response(
        JSON.stringify({ error: "At least one recipient email is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!subject || !body) {
      return new Response(
        JSON.stringify({ error: "Subject and body are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    let results = [];

    if (mode === 'bulk') {
      // Send separate emails to each recipient
      for (const recipient of to) {
        const emailResponse = await resend.emails.send({
          from: fromName ? `${fromName} <support@mail.7lakh.com>` : "Sineva AI <support@mail.7lakh.com>",
          to: [recipient],
          cc: cc || [],
          subject: subject,
          html: body.replace(/\n/g, '<br>'),
          attachments: attachments || [],
        });
        
        if (emailResponse.error) {
          results.push({
            recipient,
            success: false,
            error: emailResponse.error.message || 'Failed to send email',
          });
          console.error(`Failed to send email to ${recipient}:`, emailResponse.error);
        } else {
          results.push({
            recipient,
            success: true,
            id: emailResponse.data?.id,
          });
          console.log(`Email sent to ${recipient}:`, emailResponse);
        }
      }
    } else {
      // Send one email to all recipients at once
      const emailResponse = await resend.emails.send({
        from: fromName ? `${fromName} <support@mail.7lakh.com>` : "Sineva AI <support@mail.7lakh.com>",
        to: to,
        cc: cc || [],
        subject: subject,
        html: body.replace(/\n/g, '<br>'),
        attachments: attachments || [],
      });
      
      if (emailResponse.error) {
        results.push({
          recipients: to,
          success: false,
          error: emailResponse.error.message || 'Failed to send email',
        });
        console.error("Failed to send email:", emailResponse.error);
      } else {
        results.push({
          recipients: to,
          success: true,
          id: emailResponse.data?.id,
        });
        console.log("Email sent to all recipients:", emailResponse);
      }
    }

    const allSuccessful = results.every(r => r.success);

    return new Response(
      JSON.stringify({
        success: allSuccessful,
        mode,
        results,
      }),
      {
        status: allSuccessful ? 200 : 207, // 207 Multi-Status for partial success
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-email function:", error);
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