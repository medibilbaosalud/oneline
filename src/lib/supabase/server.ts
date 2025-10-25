import { cookies } from 'next/headers';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export function createServerSupabase() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          const cookie: ResponseCookie = { name, value, ...options };
          cookieStore.set(cookie);
        },
        remove(name: string, options: CookieOptions) {
          const cookie: ResponseCookie = { name, value: '', ...options, maxAge: 0 };
          cookieStore.set(cookie);
        },
      },
    },
  );
}
