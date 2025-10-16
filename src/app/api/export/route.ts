// src/app/api/export/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET() {
  const s = await supabaseServer();

  const {
    data: { user },
    error: authErr,
  } = await s.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // OJO: usa el nombre real de tu tabla.
  // Si tu tabla se llama "entries" cámbialo aquí.
  const { data, error } = await s
    .from("journal")
    .select("id, content, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { entries: data ?? [] },
    { headers: { "cache-control": "no-store" } }
  );
}