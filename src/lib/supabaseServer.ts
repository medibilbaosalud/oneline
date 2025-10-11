// src/lib/supabaseServer.ts
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * Pequeña fábrica para obtener un cliente Supabase en routes/server.
 * Usamos la función `cookies` importada (no la cookieStore) para que
 * `createRouteHandlerClient` tenga lo que necesita para autenticar.
 */
export function supabase() {
  return createRouteHandlerClient({ cookies });
}