import { createServerSupabase } from '@/lib/supabase/server';

export function supabaseServer() {
  return createServerSupabase();
}

export const supabaseRoute = supabaseServer;

export type SupabaseServerClient = ReturnType<typeof supabaseServer>;
