import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@3.2.0";

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 400 });
  }

  try {
    // Parse the webhook payload
    const payload = await req.json();
    
    console.log('Received webhook event:', payload.type || payload.event_type);

    // Extract user and email data from Supabase Auth webhook
    const user = payload.user;
    const email = user?.email;
    const emailData = payload.email_data;
    const type = payload.type || emailData?.email_action_type || 'confirmation';
    
    if (!email) {
      console.error('No email found in webhook payload');
      return new Response(
        JSON.stringify({ error: 'No email provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build confirmation URL - only token_hash and type are needed for verifyOtp
    const token_hash = emailData?.token_hash;
    const redirect_to = emailData?.redirect_to || 'https://sineva.ai';
    const confirmationUrl = token_hash 
      ? `https://sineva.ai/auth/callback?token_hash=${token_hash}&type=${type}`
      : redirect_to;

    console.log('Sending email to:', email);
    console.log('Email type:', type);

    // Create HTML email template
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${getEmailSubject(type)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <img src="https://apxigjramwlzjifjesph.supabase.co/storage/v1/object/public/brand-assets/sineva-logo-light.png" alt="Sineva AI" style="height: 40px; margin-bottom: 10px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Sineva AI</h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #1a1a1a; margin: 0 0 20px; font-size: 20px; font-weight: 600;">${getEmailHeading(type)}</h2>
              <p style="color: #4a5568; margin: 0 0 30px; font-size: 16px; line-height: 1.5;">${getEmailBody(type, email)}</p>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${confirmationUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">${getButtonText(type)}</a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #718096; margin: 30px 0 0; font-size: 14px; line-height: 1.5;">If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="color: #4299e1; margin: 10px 0 0; font-size: 13px; word-break: break-all;">${confirmationUrl}</p>
              
              <p style="color: #a0aec0; margin: 30px 0 0; font-size: 13px; line-height: 1.5;">If you didn't request this email, you can safely ignore it.</p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f7fafc; border-top: 1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <p style="color: #718096; margin: 0 0 15px; font-size: 14px;">
                      <a href="https://sineva.ai" style="color: #667eea; text-decoration: none; margin: 0 10px;">Home</a>
                      <a href="https://sineva.ai/features" style="color: #667eea; text-decoration: none; margin: 0 10px;">Features</a>
                      <a href="https://sineva.ai/pricing" style="color: #667eea; text-decoration: none; margin: 0 10px;">Pricing</a>
                      <a href="https://sineva.ai/contact" style="color: #667eea; text-decoration: none; margin: 0 10px;">Contact</a>
                    </p>
                    <p style="color: #a0aec0; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} Sineva AI. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    // Send email via Resend using verified sineva.ai domain
    const { data, error } = await resend.emails.send({
      from: 'Sineva AI <noreply@sineva.ai>',
      to: [email],
      subject: getEmailSubject(type),
      html: emailHtml,
    });

    if (error) {
      console.error('Resend error:', error);
      // Do NOT fail the auth flow because of email issues
      // Return 200 so Supabase auth can continue, but log the failure
      return new Response(
        JSON.stringify({ success: false, message: 'Email provider error', details: error }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Email sent successfully:', data);
    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in send-auth-email:', error);
    // Never block Supabase auth on hook failure
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error?.message || 'Unknown error',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

function getEmailSubject(type: string): string {
  switch (type) {
    case 'signup':
    case 'confirmation':
      return 'Confirm Your Email Address - Sineva AI';
    case 'recovery':
      return 'Reset Your Password - Sineva AI';
    case 'magiclink':
      return 'Your Sign-in Link - Sineva AI';
    case 'invite':
      return 'You\'ve Been Invited - Sineva AI';
    case 'email_change':
      return 'Confirm Your New Email - Sineva AI';
    default:
      return 'Email Verification - Sineva AI';
  }
}

function getEmailHeading(type: string): string {
  switch (type) {
    case 'signup':
    case 'confirmation':
      return 'Welcome to Sineva AI!';
    case 'recovery':
      return 'Reset Your Password';
    case 'magiclink':
      return 'Sign in to Sineva AI';
    case 'invite':
      return 'You\'re Invited!';
    case 'email_change':
      return 'Confirm Your New Email';
    default:
      return 'Verify Your Email';
  }
}

function getEmailBody(type: string, email: string): string {
  switch (type) {
    case 'signup':
    case 'confirmation':
      return 'Thank you for signing up! Please confirm your email address to get started with AI-powered content creation.';
    case 'recovery':
      return 'We received a request to reset your password. Click the button below to choose a new password.';
    case 'magiclink':
      return 'Click the button below to sign in to your Sineva AI account. This link will expire in 1 hour.';
    case 'invite':
      return 'You\'ve been invited to join Sineva AI. Click the button below to accept the invitation and create your account.';
    case 'email_change':
      return `Please confirm that you want to change your email address to ${email}. Click the button below to verify.`;
    default:
      return 'Please verify your email address to continue.';
  }
}

function getButtonText(type: string): string {
  switch (type) {
    case 'signup':
    case 'confirmation':
      return 'Confirm Email Address';
    case 'recovery':
      return 'Reset Password';
    case 'magiclink':
      return 'Sign In';
    case 'invite':
      return 'Accept Invitation';
    case 'email_change':
      return 'Confirm New Email';
    default:
      return 'Verify Email';
  }
}
