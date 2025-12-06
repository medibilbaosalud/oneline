import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type BrowserClient = ReturnType<typeof createClientComponentClient>;

let browserClient: BrowserClient | undefined;

export function supabaseBrowser(): BrowserClient {
  if (!browserClient) {
    browserClient = createClientComponentClient({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    });
  }

  return browserClient;
}
