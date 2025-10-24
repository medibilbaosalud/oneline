// src/lib/supabaseBrowser.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

export function supabaseBrowser() {
  if (!browserClient) {
    browserClient = createClientComponentClient();
  }

  return browserClient;
}
