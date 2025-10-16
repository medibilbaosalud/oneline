Ñ// src/app/api/journal/today/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE = process.env.SUPABASE_TABLE || "entries"; // cambia a "journal" si es tu nombre

function startEndUTC(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  const from = new Date(Date.UTC(y, m, day, 0, 0, 0));
  const to = new Date(Date.UTC(y, m, day + 1, 0, 0, 0));
  return { from, to };
}

// Devuelve la entrada de HOY (si existe) del usuario autenticado
export async function GET() {
  const s = await supabaseServer();
  const { data: { user }, error: authErr } = await s.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { from, to } = startEndUTC();
  const { data, error } = await s
    .from(TABLE)
    .select("id, content, created_at")
    .eq("user_id", user.id)
    .gte("created_at", from.toISOString())
    .lt("created_at", to.toISOString())
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Si no hay entrada de hoy, devuelve {} (no 404)
  const entry = data?.[0] ?? null;
  return NextResponse.json(entry ?? {});
}

// Crea o actualiza la entrada de HOY
export async function POST(req: NextRequest) {
  const s = await supabaseServer();
  const { data: { user }, error: authErr } = await s.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const raw = typeof body?.content === "string" ? body.content : "";
  const content = raw.slice(0, 300);
  if (!content.trim()) {
    return NextResponse.json({ error: "empty" }, { status: 400 });
  }

  const { from, to } = startEndUTC();

  // ¿Ya hay entrada hoy? -> update
  const { data: existing, error: selErr } = await s
    .from(TABLE)
    .select("id")
    .eq("user_id", user.id)
    .gte("created_at", from.toISOString())
    .lt("created_at", to.toISOString())
    .order("created_at", { ascending: false })
    .limit(1);

  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });

  if (existing && existing.length) {
    const id = existing[0].id;
    const { error: updErr } = await s.from(TABLE).update({ content }).eq("id", id);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
    return NextResponse.json({ ok: true, id, content });
  }

  // Si no, crea una nueva
  const { data: inserted, error: insErr } = await s
    .from(TABLE)
    .insert({ user_id: user.id, content })
    .select("id, content")
    .single();

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: inserted.id, content: inserted.content });
}