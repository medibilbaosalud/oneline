// src/app/api/account/export/route.ts
import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET() {
  const supabase = supabaseRoute();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // Ajusta a tu tabla: public.journal
  const { data, error } = await supabase
    .from("journal")
    .select("id, content, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ entries: data ?? [] });
}  