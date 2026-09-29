/**
 * Google OAuth 2.0 Direct Integration for NVC Connect
 * Replaces Firebase Auth popup/redirect flow which gets blocked by cross-origin iframe / WebView cookie restrictions.
 */

export const GOOGLE_CLIENT_ID = '80950080445-gi26o0fgnsta8n7sk14pk3ok1vp2prj0.apps.googleusercontent.com';

declare global {
  interface Window {
    google?: any;
  }
}

export interface GoogleUserProfile {
  email: string;
  name: string;
  picture?: string;
  sub: string;
}

export async function fetchGoogleProfile(accessToken: string): Promise<GoogleUserProfile> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Google profile (HTTP ${response.status})`);
  }

  const data = await response.json();
  if (!data.email) {
    throw new Error('Google account returned no email address.');
  }

  return {
    email: data.email,
    name: data.name || data.given_name || 'Google User',
    picture: data.picture,
    sub: data.sub,
  };
}

/**
 * Triggers Google OAuth 2.0 flow:
 * 1. Checks if Google Identity Services (GIS) tokenClient is ready (for in-page popup token flow)
 * 2. If token client succeeds, calls onSuccess callback
 * 3. Fallback: Full-page redirect directly to accounts.google.com OAuth2 endpoint
 */
export async function triggerGoogleOAuthLogin(
  onSuccess: (profile: GoogleUserProfile) => Promise<void> | void,
  onError: (err: any) => void
): Promise<void> {
  if (typeof window === 'undefined') {
    onError(new Error('Window not available'));
    return;
  }

  // Fallback direct redirect helper
  const performDirectRedirect = () => {
    const redirectUri = window.location.origin + window.location.pathname;
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'token');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('prompt', 'select_account');

    window.location.href = authUrl.toString();
  };

  // Try Google Identity Services oauth2 token client
  if (window.google?.accounts?.oauth2?.initTokenClient) {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'openid email profile',
        prompt: 'select_account',
        callback: async (tokenResponse: any) => {
          if (tokenResponse?.error) {
            console.warn('[GIS OAuth error]', tokenResponse.error);
            // If user closed popup, don't throw error
            if (tokenResponse.error === 'popup_closed_by_user') {
              return;
            }
            onError(new Error(tokenResponse.error_description || tokenResponse.error));
            return;
          }

          if (tokenResponse?.access_token) {
            try {
              const profile = await fetchGoogleProfile(tokenResponse.access_token);
              await onSuccess(profile);
            } catch (err: any) {
              onError(err);
            }
          }
        },
        error_callback: (nonOAuthError: any) => {
          console.warn('[GIS initTokenClient error]', nonOAuthError);
          // If popup failed/blocked in WebView, fallback to direct redirect
          if (nonOAuthError?.type === 'popup_failed_to_open' || nonOAuthError?.type === 'popup_closed') {
            performDirectRedirect();
          } else {
            onError(new Error(nonOAuthError?.message || 'Google OAuth failed'));
          }
        },
      });

      client.requestAccessToken();
      return;
    } catch (err) {
      console.warn('[GIS request error, fallback to direct redirect]', err);
      performDirectRedirect();
      return;
    }
  }

  // GIS script not loaded or failed: use direct redirect
  performDirectRedirect();
}

/**
 * Checks URL hash for #access_token=... returned by Google OAuth redirect
 */
export async function handleGoogleOAuthRedirect(): Promise<GoogleUserProfile | null> {
  if (typeof window === 'undefined' || !window.location.hash) {
    return null;
  }

  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');

  if (!accessToken) {
    return null;
  }

  // Clear hash from URL cleanly so token is not exposed or re-processed on reload
  const cleanUrl = window.location.origin + window.location.pathname + window.location.search;
  window.history.replaceState(null, '', cleanUrl);

  return await fetchGoogleProfile(accessToken);
}
