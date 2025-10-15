// src/lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Cliente de Supabase para Route Handlers / Server Components (Next 15).
 * Nota: es ASÍNCRONO porque en RH `cookies()` puede ser una Promise.
 */
export async function supabaseServer() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        // En RH puede lanzar si ya se envió respuesta; pero este patrón
        // es el recomendado por @supabase/ssr para Next 15.
        (cookies() as any).set(name, value, options);
      },
      remove(name: string, options: any) {
        (cookies() as any).delete(name, options);
      },
    },
  });
}