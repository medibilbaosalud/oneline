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

type AuthTokens = { accessToken: string | null; refreshToken: string | null };

function parseAuthCookie(value: string | undefined): AuthTokens {
  if (!value) {
    return { accessToken: null, refreshToken: null };
  }

  try {
    const raw = decodeURIComponent(value);
    const parsed = JSON.parse(raw) as
      | {
          access_token?: string;
          refresh_token?: string;
          currentSession?: { access_token?: string; refresh_token?: string };
        }
      | undefined;

    if (!parsed) {
      return { accessToken: null, refreshToken: null };
    }

    const accessToken =
      typeof parsed.access_token === 'string'
        ? parsed.access_token
        : typeof parsed.currentSession?.access_token === 'string'
        ? parsed.currentSession.access_token
        : null;
    const refreshToken =
      typeof parsed.refresh_token === 'string'
        ? parsed.refresh_token
        : typeof parsed.currentSession?.refresh_token === 'string'
        ? parsed.currentSession.refresh_token
        : null;

    return { accessToken: accessToken ?? null, refreshToken: refreshToken ?? null };
  } catch {
    return { accessToken: null, refreshToken: null };
  }
}

async function readAuthTokensFromCookies(): Promise<AuthTokens> {
  const store = await readCookieStore();
  const projectRef = getSupabaseProjectRef();

  const candidate = store
    .getAll()
    .find((cookie) => cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token'));

  if (candidate?.value) {
    const parsed = parseAuthCookie(candidate.value);
    if (parsed.accessToken && parsed.refreshToken) {
      return parsed;
    }
  }

  const fallback = readSupabaseTokensFromCookies(store, { projectRef });
  return fallback;
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

  const headerStore = await headers();
  const cookieTokens = await readAuthTokensFromCookies();

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
