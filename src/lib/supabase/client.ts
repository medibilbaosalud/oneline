import { createBrowserClient } from '@supabase/ssr';
import type { AuthChangeEvent, Session, SupabaseClient } from '@supabase/supabase-js';

export const supabaseClient = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

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

function ensureAuthListener(client: SupabaseClient) {
  if (typeof window === 'undefined' || authListenerBound) {
    return;
  }

  authListenerBound = true;

  void client.auth.getSession().then((result) => {
    void postAuthState('INITIAL_SESSION', result.data.session ?? null, true);
  });

  client.auth.onAuthStateChange((event, session) => {
    void postAuthState(event, session, true);
  });
}

export function supabaseBrowser(): SupabaseClient {
  ensureAuthListener(supabaseClient);
  return supabaseClient;
}

export async function syncServerAuth(
  event: AuthChangeEvent,
  session: Session | null,
  options?: { suppressErrors?: boolean },
) {
  const suppressErrors = options?.suppressErrors ?? true;
  await postAuthState(event, session, suppressErrors);
}
