// src/app/api/journal/today/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const runtime = "nodejs";       // evita edge
export const dynamic = "force-dynamic";

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(_req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ entry: null, error: "unauthenticated" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("journal")
      .select("id, user_id, day, content, created_at, updated_at")
      .eq("user_id", user.id)
      .eq("day", todayUTC())
      .maybeSingle();

    if (error) {
      console.error("[GET] supabase error:", error);
      return NextResponse.json({ entry: null, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ entry: data ?? null });
  } catch (e: any) {
    console.error("[GET] fatal:", e);
    return NextResponse.json({ entry: null, error: e?.message || "server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const started = Date.now();
  console.time("[POST] journal/today");
  try {
    const supabase = createRouteHandlerClient({ cookies });

    console.log("[POST] 1) getUser()");
    const { data: { user }, error: getUserError } = await supabase.auth.getUser();
    if (getUserError) console.error("[POST] getUser error:", getUserError);
    if (!user) {
      console.timeEnd("[POST] journal/today");
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    console.log("[POST] 2) parse body");
    let body: any = null;
    try {
      body = await req.json();
    } catch (e) {
      console.error("[POST] invalid json:", e);
      console.timeEnd("[POST] journal/today");
      return NextResponse.json({ error: "invalid json" }, { status: 400 });
    }

    const raw = (body?.content ?? "").toString();
    const content = raw.slice(0, 300);
    const day = todayUTC();
    const nowIso = new Date().toISOString();

    console.log("[POST] 3) upsert", { user_id: user.id, day, content_len: content.length });

    // Asegúrate: en la tabla 'journal' existen columnas user_id(uuid), day(date o text), content(text), updated_at(timestamp) o quita updated_at si no existe.
    const { data, error } = await supabase
      .from("journal")
      .upsert(
        { user_id: user.id, day, content, updated_at: nowIso },
        { onConflict: "user_id,day" }    // requiere índice único (user_id, day)
      )
      .select("id, user_id, day, content, created_at, updated_at")
      .single();

    if (error) {
      console.error("[POST] supabase upsert error:", error);
      console.timeEnd("[POST] journal/today");
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("[POST] 4) ok in", Date.now() - started, "ms");
    console.timeEnd("[POST] journal/today");
    return NextResponse.json({ ok: true, entry: data });
  } catch (e: any) {
    console.error("[POST] fatal:", e);
    console.timeEnd("[POST] journal/today");
    // Lo MÁS importante: RESPONDER SIEMPRE, aunque haya error
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}
