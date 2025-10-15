// src/app/api/history/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    // No logueado: devuelve lista vacía (o 401 si prefieres)
    return NextResponse.json({ entries: [] });
  }

  // Ajusta la tabla/campos a tu esquema. Aquí uso "journal"
  const { data, error } = await sb
    .from("journal")
    .select("id, day, content, created_at, updated_at")
    .eq("user_id", user.id)
    .order("day", { ascending: false })
    .limit(365);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entries: data ?? [] });
}