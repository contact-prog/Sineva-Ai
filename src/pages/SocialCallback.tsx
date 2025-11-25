import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function SocialCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Extract OAuth parameters from URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      // Send error to parent window and close
      if (window.opener) {
        window.opener.postMessage({ type: 'oauth_error', error }, window.location.origin);
        window.close();
      } else {
        navigate('/app/social?error=' + error);
      }
      return;
    }

    if (code && state) {
      // Send successful callback to parent window
      if (window.opener) {
        window.opener.postMessage({ type: 'oauth_callback', code, state }, window.location.origin);
        window.close();
      } else {
        // If not in popup, redirect to social page
        navigate('/app/social?code=' + code + '&state=' + state);
      }
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  );
}
