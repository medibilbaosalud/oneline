// src/lib/supabaseServer.ts
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function supabaseServer() {
  const cookieStore = await cookies(); // in App Router this returns a Promise-like
  const mutableCookies = cookieStore as unknown as {
    get(name: string): { value?: string } | undefined;
    set?(options: { name: string; value: string } & CookieOptions): void;
  };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        // Some route handlers may not allow setting cookies post-response; that's fine.
        try {
          mutableCookies.set?.({ name, value, ...options });
        } catch {}
      },
      remove(name: string, options: CookieOptions) {
        try {
          mutableCookies.set?.({ name, value: '', ...options });
        } catch {}
      },
    },
  });
}
