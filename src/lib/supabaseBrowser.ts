// src/lib/supabaseBrowser.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';

type BrowserClient = ReturnType<typeof createClientComponentClient>;

let browserClient: BrowserClient | null = null;
let syncInitialized = false;

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
  await postAuthState(event, session, suppressErrors);
}

export function supabaseBrowser(): BrowserClient {
  if (!browserClient) {
    browserClient = createClientComponentClient();
  }

  if (!syncInitialized && browserClient) {
    syncInitialized = true;
    browserClient.auth.onAuthStateChange((event, session) => {
      void postAuthState(event, session, true);
    });
  }

  return browserClient;
}
