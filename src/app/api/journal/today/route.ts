// src/app/api/journal/today/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const runtime = "nodejs";        // evita edge
export const dynamic = "force-dynamic"; // evita cachés

function todayUTC() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function GET(_req: NextRequest) {
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
    return NextResponse.json({ entry: null, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ entry: data ?? null });
}

export async function POST(req: NextRequest) {
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

  const content = (body?.content ?? "").toString().slice(0, 300);
  const day = todayUTC();
  const nowIso = new Date().toISOString();

  // upsert por (user_id, day) — necesita el índice único journal_user_day_key
  const { data, error } = await supabase
    .from("journal")
    .upsert({ user_id: user.id, day, content, updated_at: nowIso }, { onConflict: "user_id,day" })
    .select("id, user_id, day, content, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, entry: data });
}
