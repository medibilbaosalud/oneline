// src/app/api/summaries/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Ventana mensual en UTC
function monthWindowUTC(d = new Date()) {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0));
  return { start, end };
}

export async function POST(req: NextRequest) {
  const sb = await supabaseServer();

  const {
    data: { user },
    error: authErr,
  } = await sb.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { start, end } = monthWindowUTC();

  // Límite: 10 resúmenes por usuario y mes
  const { count, error: countErr } = await sb
    .from("summaries") // <-- si tu tabla se llama distinto, cámbiala aquí
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString());

  if (countErr) {
    return NextResponse.json({ error: countErr.message }, { status: 400 });
  }
  if ((count ?? 0) >= 10) {
    return NextResponse.json({ error: "monthly-limit-reached" }, { status: 429 });
  }

  // Cuerpo de la petición (opciones de generación)
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // cuerpo vacío o inválido -> body se queda como {}
  }

  // TODO: aquí generas la historia real; de momento acepto `body.story` si viene
  const story: string = typeof body.story === "string" ? body.story : "";

  // Guardar el resumen
  const { data: inserted, error: insertErr } = await sb
    .from("summaries") // <-- mismo nombre que arriba
    .insert({
      user_id: user.id,
      story,
      payload: body ?? {},
    })
    .select()
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, summary: inserted });
}