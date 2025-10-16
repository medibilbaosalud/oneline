// src/lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Crea un cliente de Supabase para uso en Server Components o Route Handlers.
 * ¡Debe usarse siempre con await!
 */
export async function supabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // ⚠️ cookieStore es un objeto, no Promise
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );
}