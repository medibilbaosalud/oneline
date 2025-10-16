// src/app/api/history/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const s = supabaseServer();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ entries: [] });

  async function q(table: "entries" | "journal") {
    return s
      .from(table)
      .select("id, content, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
  }

  // intenta entries -> si viene vacío o error, prueba journal
  let { data, error } = await q("entries");
  if (error || !data?.length) {
    const alt = await q("journal");
    if (!alt.error && alt.data) data = alt.data;
  }

  return NextResponse.json({ entries: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}