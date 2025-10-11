// src/lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

// Cliente de Supabase para handlers de rutas (server)
export function supabaseServer() {
  return createRouteHandlerClient({ cookies });
}

// Alias por compatibilidad: algunos archivos importan { supabaseRoute }
export const supabaseRoute = supabaseServer;

export type SupabaseServerClient = ReturnType<typeof supabaseServer>;

// Utilidad por si quieres obtener el usuario ya resuelto
export async function getUserServer() {
  const supabase = supabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { supabase, user, error };
}