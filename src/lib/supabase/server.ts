import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';

function withDefaultPath(options: CookieOptions | undefined): CookieOptions {
  return {
    path: '/',
    ...options,
  };
}

export function createServerSupabase() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          const store = await cookies();
          return store.getAll().map(({ name, value }) => ({ name, value }));
        },
        async setAll(cookieList) {
          const store = await cookies();

          cookieList.forEach(({ name, value, options }) => {
            try {
              store.set({
                name,
                value,
                ...withDefaultPath(options),
              });
            } catch (error) {
              if (process.env.NODE_ENV === 'development') {
                console.warn('[supabase] unable to persist cookie', name, error);
              }
            }
          });
        },
      },
    },
  );
}
