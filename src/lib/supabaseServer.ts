// src/lib/supabaseServer.ts
import { cookies, headers } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { getSupabaseProjectRef, readSupabaseTokensFromCookies } from '@/lib/supabaseTokens';

function extractBearer(headerValue: string | null | undefined) {
  if (!headerValue) return null;
  if (headerValue.startsWith('Bearer ')) {
    return headerValue.slice(7).trim() || null;
  }
  return headerValue.trim() || null;
}

export async function supabaseServer() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const mutableCookies = cookieStore as unknown as {
    get(name: string): { value: string } | undefined;
    set?: (options: { name: string; value: string } & CookieOptions) => void;
  };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const client = createServerClient(url, key, {
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

  const projectRef = getSupabaseProjectRef();
  const cookieTokens = readSupabaseTokensFromCookies(cookieStore, { projectRef });
  const accessToken =
    extractBearer(headerStore.get('authorization')) ??
    cookieStore.get('sb-access-token')?.value ??
    cookieTokens.accessToken ??
    null;
  const refreshToken =
    headerStore.get('x-supabase-refresh') ??
    cookieStore.get('sb-refresh-token')?.value ??
    cookieTokens.refreshToken ??
    null;

  if (accessToken && refreshToken) {
    try {
      await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[supabaseServer] Failed to set session from tokens', error);
    }
  }

  return client;
}
