import { cookies, headers } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseProjectRef, readSupabaseTokensFromCookies } from '@/lib/supabaseTokens';

function withDefaultPath(options: CookieOptions | undefined): CookieOptions {
  return {
    path: '/',
    ...options,
  };
}

function extractBearer(headerValue: string | null | undefined) {
  if (!headerValue) return null;
  if (headerValue.startsWith('Bearer ')) {
    return headerValue.slice(7).trim() || null;
  }
  return headerValue.trim() || null;
}

type MutableCookieStore = {
  get(name: string): { value: string } | undefined;
  getAll(): Array<{ name: string; value: string }>;
  set?: (cookie: { name: string; value: string } & CookieOptions) => void;
};

async function readCookieStore(): Promise<MutableCookieStore> {
  const store = await cookies();
  return store as unknown as MutableCookieStore;
}

export async function createServerSupabase(): Promise<SupabaseClient> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const client = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      async getAll() {
        const store = await readCookieStore();
        return store.getAll().map(({ name, value }) => ({ name, value }));
      },
      async setAll(cookieList) {
        const store = await readCookieStore();

        if (typeof store.set !== 'function') {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[supabase] cookie store is not mutable; skipping setAll');
          }
          return;
        }

        cookieList.forEach(({ name, value, options }) => {
          try {
            const normalized = withDefaultPath(options);
            if (value) {
              store.set!({ name, value, ...normalized });
            } else {
              store.set!({ name, value: '', ...normalized, maxAge: 0 });
            }
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('[supabase] unable to persist cookie', name, error);
            }
          }
        });
      },
    },
  });

  const {
    data: { session },
  } = await client.auth.getSession();

  if (session) {
    return client;
  }

  const [cookieStore, headerStore] = await Promise.all([readCookieStore(), headers()]);
  const projectRef = getSupabaseProjectRef();
  const cookieTokens = readSupabaseTokensFromCookies(cookieStore, { projectRef });

  const accessToken =
    extractBearer(headerStore.get('authorization')) ?? cookieTokens.accessToken;
  const refreshToken =
    headerStore.get('x-supabase-refresh') ?? cookieTokens.refreshToken;

  if (!accessToken || !refreshToken) {
    return client;
  }

  try {
    await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[supabase] failed to hydrate server session from cookies', error);
    }
  }

  return client;
}
