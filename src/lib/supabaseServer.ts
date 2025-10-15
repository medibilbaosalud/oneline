// src/lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Crea un cliente de Supabase para entornos server (Route Handlers / Server Components)
 * usando las cookies de Next para la sesión.
 */
export function supabaseServer() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // En Route Handlers esto puede lanzar si la respuesta ya fue enviada;
          // lo envolvemos en try por seguridad.
          try {
            // @ts-ignore - next/headers set API
            cookieStore.set({ name, value, ...options });
          } catch {}
        },
        remove(name: string, options: any) {
          try {
            // @ts-ignore
            cookieStore.set({ name, value: "", ...options, maxAge: 0 });
          } catch {}
        },
      },
    }
  );
}

// Alias para compatibilidad con imports antiguos { supabase }
export const supabase = supabaseServer;