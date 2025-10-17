// src/lib/supabaseServer.ts
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function supabaseServer() {
  const cookieStore = await cookies(); // in App Router this returns a Promise-like
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(url, key, {
    cookies: {
      get(name: string) {
        // @ts-expect-error: cookies() is async in app routes
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        // Some route handlers may not allow setting cookies post-response; that's fine.
        try {
          // @ts-expect-error: mutate async cookie store in app router
          cookieStore.set({ name, value, ...options });
        } catch {}
      },
      remove(name: string, options: CookieOptions) {
        try {
          // @ts-expect-error: mutate async cookie store in app router
          cookieStore.set({ name, value: '', ...options });
        } catch {}
      },
    },
  });
}
