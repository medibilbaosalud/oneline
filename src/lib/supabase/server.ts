import { cookies } from 'next/headers';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

function serializeCookie({ name, value, options }: {
  name: string;
  value: string;
  options?: CookieOptions;
}): ResponseCookie {
  const { path, ...rest } = options ?? {};

  return {
    name,
    value,
    path: path ?? '/',
    ...rest,
  } satisfies ResponseCookie;
}

export function createServerSupabase() {
  const cookieStorePromise = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: async () => {
          const cookieStore = await cookieStorePromise;
          return cookieStore
            .getAll()
            .map((cookie) => ({ name: cookie.name, value: cookie.value }));
        },
        setAll: async (cookiesToSet) => {
          const cookieStore = await cookieStorePromise;
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(
              serializeCookie({
                name,
                value,
                options,
              }),
            );
          });
        },
      },
    },
  );
}
