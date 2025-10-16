// src/app/api/summaries/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // ✅ obtener el cliente REAL, no la Promesa
  const sb = await supabaseServer();

  const {
    data: { user },
    error: authErr,
  } = await sb.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  // ...tu lógica existente (límite mensual, generación, etc.)
  // devuelve NextResponse.json(...)
}
  // Ventana mensual
  const { startDate, endDate, startISO, endISO } = monthWindow(new Date());

  // Límite: 10 resúmenes en el mes actual
  const { data: existing, error: selErr } = await sb
    .from("summaries")
    .select("id, created_at")
    .eq("user_id", user.id)
    .gte("created_at", startISO)
    .lte("created_at", endISO);

  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });
  if ((existing?.length ?? 0) >= 10) {
    return NextResponse.json({ error: "Monthly limit reached (10)." }, { status: 429 });
  }

  // Entradas del mes desde tu tabla 'journal'
  const { data: entries, error: jErr } = await sb
    .from("journal")
    .select("day, content")
    .eq("user_id", user.id)
    .gte("day", startDate)
    .lte("day", endDate)
    .order("day", { ascending: true });

  if (jErr) return NextResponse.json({ error: jErr.message }, { status: 500 });
  if (!entries || entries.length === 0) {
    return NextResponse.json({ error: "No entries this month." }, { status: 400 });
  }

  // Resumen simple en HTML (pre) si no usas Gemini aquí
  const plain = entries.map((e) => `${e.day}: ${e.content ?? ""}`).join("\n");
  const html = `<pre>${escapeHtml(plain)}</pre>`;

  const { data: inserted, error: insErr } = await sb
    .from("summaries")
    .insert({
      user_id: user.id,
      period: "monthly",
      start_date: startDate,
      end_date: endDate,
      html,
    })
    .select()
    .single();

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, summary: inserted });
}