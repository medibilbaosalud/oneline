import { createBrowserClient } from '@supabase/ssr';
import type { AuthChangeEvent, Session, SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;
let authListenerBound = false;

async function postAuthState(event: AuthChangeEvent, session: Session | null, suppressErrors: boolean) {
  try {
    const response = await fetch('/api/auth/callback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ event, session }),
    });

      if (!response.ok) {
        if (!suppressErrors) {
          const detail = (await response.json().catch(() => null)) as { message?: string } | null;
          const reason = detail?.message ?? response.statusText;
          throw new Error(`Auth sync failed: ${response.status} ${reason}`);
        }
        console.warn('[supabase] auth sync responded with', response.status);
    }
  } catch (error) {
    if (!suppressErrors) {
      throw error;
    }
    console.error('[supabase] failed to sync auth state', error);
  }
}

export function supabaseBrowser(): SupabaseClient {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          name: 'sb',
          lifetime: 60 * 60 * 24 * 365,
          domain: undefined,
          path: '/',
          sameSite: 'lax',
        },
      },
    );
  }

  if (browserClient && !authListenerBound) {
    authListenerBound = true;
    void browserClient.auth.getSession().then((result) => {
      void postAuthState('INITIAL_SESSION', result.data.session ?? null, true);
    });

    browserClient.auth.onAuthStateChange((event, session) => {
      void postAuthState(event, session, true);
    });
  }

  return browserClient;
}

export async function syncServerAuth(
  event: AuthChangeEvent,
  session: Session | null,
  options?: { suppressErrors?: boolean },
) {
  const suppressErrors = options?.suppressErrors ?? true;
  await postAuthState(event, session, suppressErrors);
}
