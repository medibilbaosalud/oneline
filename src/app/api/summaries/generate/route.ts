import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const sb = supabaseServer();
  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // Ventana mensual (UTC)
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();

  // Cuenta usos del mes
  const { count, error: countErr } = await sb
    .from("summary_usage")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", monthStart)
    .lt("created_at", monthEnd);

  if (countErr) return NextResponse.json({ error: countErr.message }, { status: 500 });

  const LIMIT = 10;
  if ((count ?? 0) >= LIMIT) {
    return NextResponse.json(
      { error: "Monthly limit reached", remaining: 0, limit: LIMIT },
      { status: 429 }
    );
  }

  // --- aquí generas tu resumen como ya lo hacías ---
  // const body = await req.json(); // e.g. { from, to }
  // const result = await generateSummary(body)

  // Registra el uso
  const { error: insErr } = await sb.from("summary_usage").insert({ user_id: user.id });
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  // Devuelve tu resultado real
  return NextResponse.json({
    ok: true,
    // summary: result,
    remaining: LIMIT - ((count ?? 0) + 1),
    limit: LIMIT,
  });
}