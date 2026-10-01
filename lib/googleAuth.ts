/**
 * Google OAuth 2.0 Direct Integration for NVC Connect
 *
 * Web:    Uses Google Identity Services (GIS) token popup, falling back to
 *         direct redirect to accounts.google.com.
 * Mobile: Uses expo-auth-session + expo-web-browser to open the system browser
 *         for OAuth (avoids Google's WebView block on Android).
 */

import { Platform } from 'react-native';

export const GOOGLE_CLIENT_ID =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID) ||
  '80950080445-5hvgpg37oe0bt4gkqnghou3cvung8mlo.apps.googleusercontent.com';

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

// ---------------------------------------------------------------------------
// Mobile OAuth via expo-auth-session + expo-web-browser
// ---------------------------------------------------------------------------

async function triggerMobileGoogleOAuth(
  onSuccess: (profile: GoogleUserProfile) => Promise<void> | void,
  onError: (err: any) => void,
): Promise<void> {
  try {
    const WebBrowser = await import('expo-web-browser');
    const { getApiBaseUrl } = await import('../models/storage');

    // Backend relay endpoint: Google redirects here, backend redirects to
    // nvcconnect://redirect?code=xxx so the app catches it via deep link.
    // This avoids Google Console rejecting custom-scheme redirect URIs.
    const apiBase = getApiBaseUrl();
    const redirectUri = `${apiBase}/auth/google/mobile-callback`;
    const appReturnScheme = 'nvcconnect://redirect';

    // Build Google OAuth URL (auth code flow, no PKCE needed since relay is HTTPS)
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('prompt', 'select_account');
    authUrl.searchParams.set('access_type', 'offline');

    // Open system browser; it returns when the browser navigates to nvcconnect://
    const result = await WebBrowser.openAuthSessionAsync(
      authUrl.toString(),
      appReturnScheme,
    );

    if (result.type === 'success' && result.url) {
      const url = new URL(result.url);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        onError(new Error(error));
        return;
      }

      if (!code) {
        onError(new Error('No authorization code received'));
        return;
      }

      // Exchange authorization code for access token via backend relay
      const tokenResponse = await fetch(`${apiBase}/auth/google/exchange-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          redirect_uri: redirectUri,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok || !tokenData.access_token) {
        onError(new Error(tokenData.error_description || tokenData.error || 'Token exchange failed'));
        return;
      }

      const profile = await fetchGoogleProfile(tokenData.access_token);
      await onSuccess(profile);
    } else if (result.type === 'cancel' || result.type === 'dismiss') {
      return;
    } else {
      onError(new Error('Google sign-in was not completed'));
    }
  } catch (err: any) {
    onError(err);
  }
}

// ---------------------------------------------------------------------------
// Web OAuth via GIS popup / direct redirect
// ---------------------------------------------------------------------------

function triggerWebGoogleOAuth(
  onSuccess: (profile: GoogleUserProfile) => Promise<void> | void,
  onError: (err: any) => void,
): void {
  if (typeof window === 'undefined') {
    onError(new Error('Window not available'));
    return;
  }

  // Fallback direct redirect helper (Auth code flow — response_type=token is deprecated by Google)
  const performDirectRedirect = () => {
    const redirectUri = window.location.origin + window.location.pathname;
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('prompt', 'select_account');
    authUrl.searchParams.set('access_type', 'offline');

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

// ---------------------------------------------------------------------------
// Public API — delegates to the right flow per platform
// ---------------------------------------------------------------------------

/**
 * Triggers Google OAuth 2.0 flow:
 * - Web: GIS popup or direct redirect
 * - Mobile (Android/iOS): expo-auth-session system browser flow
 */
export async function triggerGoogleOAuthLogin(
  onSuccess: (profile: GoogleUserProfile) => Promise<void> | void,
  onError: (err: any) => void
): Promise<void> {
  if (Platform.OS === 'web') {
    triggerWebGoogleOAuth(onSuccess, onError);
  } else {
    await triggerMobileGoogleOAuth(onSuccess, onError);
  }
}

/**
 * Checks URL for OAuth response:
 * 1. Query parameter ?code=... (authorization code flow)
 * 2. Hash parameter #access_token=... (implicit token flow)
 */
export async function handleGoogleOAuthRedirect(): Promise<GoogleUserProfile | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  // 1. Authorization Code Flow (?code=xxx)
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  if (code) {
    try {
      const { getApiBaseUrl } = await import('../models/storage');
      const apiBase = getApiBaseUrl();
      const redirectUri = window.location.origin + window.location.pathname;
      const tokenResponse = await fetch(`${apiBase}/auth/google/exchange-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          redirect_uri: redirectUri,
        }),
      });

      const tokenData = await tokenResponse.json();
      if (tokenData.access_token) {
        // Clear query parameters cleanly
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState(null, '', cleanUrl);
        return await fetchGoogleProfile(tokenData.access_token);
      }
    } catch (err) {
      console.warn('[GoogleAuth] Code exchange error:', err);
    }
  }

  // 2. Implicit Flow fallback (#access_token=xxx)
  if (window.location.hash) {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');

    if (accessToken) {
      // Clear hash from URL cleanly so token is not exposed or re-processed on reload
      const cleanUrl = window.location.origin + window.location.pathname + window.location.search;
      window.history.replaceState(null, '', cleanUrl);

      return await fetchGoogleProfile(accessToken);
    }
  }

  return null;
}
