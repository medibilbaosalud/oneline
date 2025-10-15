// src/app/api/history/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET() {
  const sb = supabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ entries: [] });

  const { data, error } = await sb
    .from("entries") // <-- tabla correcta
    .select("id, content, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ entries: [], error: error.message }, { status: 500 });
  }
  return NextResponse.json({ entries: data ?? [] });
}