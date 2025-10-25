// src/lib/supabaseBrowser.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';

type BrowserClient = ReturnType<typeof createClientComponentClient>;

let browserClient: BrowserClient | null = null;
let syncInitialized = false;
let fetchPatched = false;
let currentAccessToken: string | null = null;
let currentRefreshToken: string | null = null;

function updateTokens(session: Session | null) {
  currentAccessToken = session?.access_token ?? null;
  currentRefreshToken = session?.refresh_token ?? null;
}

function normalizeUrl(input: RequestInfo | URL): string | null {
  if (typeof input === 'string') {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  if (typeof Request !== 'undefined' && input instanceof Request) {
    return input.url;
  }
  return null;
}

function shouldAugment(url: string | null): boolean {
  if (!url) return true;
  const trimmed = url.trim();
  if (!trimmed) return true;
  const startsWithHttp = /^https?:\/\//i.test(trimmed);
  if (startsWithHttp && typeof window !== 'undefined') {
    try {
      const parsed = new URL(trimmed);
      if (parsed.origin !== window.location.origin) {
        return false;
      }
    } catch {
      return false;
    }
  }
  return trimmed.startsWith('/api') || trimmed.includes('/api/');
}

function ensurePatchedFetch() {
  if (fetchPatched) return;
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') {
    return;
  }

  const originalFetch = window.fetch.bind(window);
  fetchPatched = true;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = normalizeUrl(input);
    const finalInit: RequestInit = { ...(init ?? {}) };

    const sameOrigin =
      !url ||
      !/^https?:\/\//i.test(url) ||
      (typeof window !== 'undefined' && url.startsWith(window.location.origin));

    if (sameOrigin && !finalInit.credentials) {
      finalInit.credentials = 'include';
    }

    if (shouldAugment(url)) {
      const headers = new Headers(
        finalInit.headers ??
          (typeof Request !== 'undefined' && input instanceof Request
            ? input.headers
            : undefined),
      );

      if (currentAccessToken && !headers.has('authorization')) {
        headers.set('authorization', `Bearer ${currentAccessToken}`);
      }
      if (currentRefreshToken && !headers.has('x-supabase-refresh')) {
        headers.set('x-supabase-refresh', currentRefreshToken);
      }

      finalInit.headers = headers;
    }

    if (typeof Request !== 'undefined' && input instanceof Request) {
      const request = new Request(input, finalInit);
      return originalFetch(request);
    }

    return originalFetch(input as any, finalInit);
  };
}

async function postAuthState(
  event: AuthChangeEvent,
  session: Session | null,
  suppressErrors: boolean,
) {
  try {
    const response = await fetch('/api/auth/callback', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ event, session }),
    });

    if (!response.ok) {
      const detail = await response
        .json()
        .catch(() => ({ error: 'unknown', detail: response.statusText }));
      const syncError = Object.assign(new Error('Failed to sync auth state'), {
        detail,
      });
      if (!suppressErrors) {
        throw syncError;
      }
      // eslint-disable-next-line no-console
      console.warn('[supabaseBrowser] Auth sync responded with an error', detail);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[supabaseBrowser] Failed to sync auth state', error);
    if (!suppressErrors) {
      throw error;
    }
  }
}

export async function syncServerAuth(
  event: AuthChangeEvent,
  session: Session | null,
  { suppressErrors = true }: { suppressErrors?: boolean } = {},
) {
  updateTokens(session);
  await postAuthState(event, session, suppressErrors);
}

export function supabaseBrowser(): BrowserClient {
  if (!browserClient) {
    browserClient = createClientComponentClient();
  }

  ensurePatchedFetch();

  if (!syncInitialized && browserClient) {
    syncInitialized = true;
    void browserClient.auth
      .getSession()
      .then(({ data }) => {
        updateTokens(data.session ?? null);
      })
      .catch(() => {
        updateTokens(null);
      });

    browserClient.auth.onAuthStateChange((event, session) => {
      updateTokens(session);
      void postAuthState(event, session, true);
    });
  }

  return browserClient;
}
