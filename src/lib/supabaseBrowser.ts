import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';

type BrowserClient = ReturnType<typeof createBrowserSupabaseClient<any>>;

let browserClient: BrowserClient | undefined;

export function supabaseBrowser(): BrowserClient {
  if (!browserClient) {
    browserClient = createBrowserSupabaseClient({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      options: {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      },
    });
  }

  return browserClient;
}
