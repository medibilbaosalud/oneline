// src/lib/supabaseServer.ts
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * Fábrica ligera para crear un cliente Supabase válido en server routes.
 * Exportamos varias formas (named + alias + default) para que las rutas
 * existentes puedan importar el nombre que ya están usando.
 */

export function supabase() {
  return createRouteHandlerClient({ cookies });
}

// Alias por compatibilidad con imports que esperan `supabaseServer`
export const supabaseServer = supabase;

// Export por defecto también (opcional)
export default supabase;