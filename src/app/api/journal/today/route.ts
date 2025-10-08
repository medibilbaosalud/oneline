// src/app/api/journal/today/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ entry: null, error: "unauthenticated" }, { status: 401 });
    }

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
    const { data, error } = await supabase
      .from("journal")
      .select("id,user_id,day,content,preview,created_at,updated_at")
      .eq("user_id", user.id)
      .eq("day", today)
      .maybeSingle();

    if (error) {
      console.error("[GET /journal/today] supabase error:", error.message);
      return NextResponse.json({ entry: null, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ entry: data ?? null });
  } catch (err: any) {
    console.error("[GET /journal/today] fatal:", err);
    return NextResponse.json({ entry: null, error: err?.message || "internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "invalid json" }, { status: 400 });
    }

    const raw = (body?.content ?? "").toString();
    const content = raw.slice(0, 300);              // refuerzo del límite
    const preview = content.slice(0, 200);          // opcional
    const day = new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();

    // Importante: Prefer: return=representation (supabase-js lo añade al usar .select())
    const { data, error } = await supabase
      .from("journal")
      .upsert(
        {
          user_id: user.id,
          day,
          content,
          preview,
          updated_at: nowIso,
        },
        { onConflict: "user_id,day" }
      )
      .select("id,user_id,day,content,preview,created_at,updated_at")
      .maybeSingle();

    if (error) {
      console.error("[POST /journal/today] supabase error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, entry: data });
  } catch (err: any) {
    console.error("[POST /journal/today] fatal:", err);
    return NextResponse.json({ error: err?.message || "internal error" }, { status: 500 });
  }
}
