// src/lib/supabaseBrowser.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { SupabaseClient, Session } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;
let syncInitialized = false;

async function syncAuthState(event: string, session: Session | null) {
  try {
    await fetch('/api/auth/callback', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ event, session }),
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[supabaseBrowser] Failed to sync auth state', error);
  }
}

export function supabaseBrowser(): SupabaseClient {
  if (!browserClient) {
    browserClient = createClientComponentClient();
  }

  if (!syncInitialized && browserClient) {
    syncInitialized = true;
    browserClient.auth.onAuthStateChange((event, session) => {
      void syncAuthState(event, session);
    });
  }

  return browserClient;
}
