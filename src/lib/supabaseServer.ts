// src/lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase para Route Handlers / Server Components.
 * Compatible con Next 14/15 (cookies() puede ser Promise).
 */
export async function supabaseServer(): Promise<SupabaseClient> {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // En Next 15 los tipos de cookies() son Promise<ReadonlyRequestCookies>
  // -> lo resolvemos aquí una vez para poder usar get/set/remove síncronos.
  const cookieStore: any = await (cookies() as any);

  const client = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore?.get?.(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore?.set?.({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore?.set?.({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });

  return client as SupabaseClient;
}