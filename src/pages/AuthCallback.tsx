import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const AuthCallback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState<string>("Verifying your email, please wait...");

  useEffect(() => {
    const verifyEmail = async () => {
      const params = new URLSearchParams(location.search);
      const tokenHash = params.get("token_hash");
      const type = params.get("type") as
        | "signup"
        | "recovery"
        | "magiclink"
        | "invite"
        | "email_change"
        | null;

      if (!tokenHash || !type) {
        setStatus("error");
        setMessage("Invalid or expired verification link.");
        return;
      }

      try {
        const { error } = await supabase.auth.verifyOtp({
          type,
          token_hash: tokenHash,
        });

        if (error) {
          console.error("Error verifying email:", error);
          setStatus("error");
          setMessage(error.message || "Failed to verify email. Please try again.");
          return;
        }

        // Fetch the authenticated user and redirect based on onboarding status
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setStatus("error");
          setMessage("Verification succeeded, but we couldn't sign you in. Please log in manually.");
          return;
        }

        try {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("onboarding_completed")
            .eq("id", user.id)
            .maybeSingle();

          setStatus("success");
          setMessage("Email verified successfully! Redirecting you now...");

          setTimeout(() => {
            if (!profile?.onboarding_completed) {
              navigate("/magic-onboarding", { replace: true });
            } else {
              navigate("/app/chat", { replace: true });
            }
          }, 1200);
        } catch (error) {
          console.error("Error checking onboarding after verification:", error);
          setStatus("success");
          setMessage("Email verified! Redirecting you to onboarding...");
          setTimeout(() => navigate("/magic-onboarding", { replace: true }), 1200);
        }
      } catch (error: any) {
        console.error("Unexpected error during verification:", error);
        setStatus("error");
        setMessage(error?.message || "Something went wrong while verifying your email.");
      }
    };

    void verifyEmail();
  }, [location.search, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {status === "verifying" && (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <h1 className="text-2xl font-semibold">Verifying your email</h1>
            <p className="text-muted-foreground">{message}</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center space-y-4">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <h1 className="text-2xl font-semibold">Email verified</h1>
            <p className="text-muted-foreground">{message}</p>
            <Button onClick={() => navigate("/app/chat", { replace: true })}>Go to app</Button>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center space-y-4">
            <XCircle className="h-10 w-10 text-destructive" />
            <h1 className="text-2xl font-semibold">Verification problem</h1>
            <p className="text-muted-foreground">{message}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate("/auth", { replace: true })}>
                Back to login
              </Button>
              <Button onClick={() => navigate("/", { replace: true })}>Go to homepage</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
