// src/app/api/summaries/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { ensureMonthlySummaryWindow, incrementMonthlySummaryUsage } from "@/lib/summaryUsage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const sb = await supabaseServer();

  const {
    data: { user },
    error: authErr,
  } = await sb.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { used } = await ensureMonthlySummaryWindow(sb, user.id, new Date());
  const unlimited = user.email?.toLowerCase() === "aitoralboniga@gmail.com";
  const limit = unlimited ? 1000000 : 10;
  if (!unlimited && used >= limit) {
    return NextResponse.json({ error: "monthly-limit-reached" }, { status: 429 });
  }

  // Parse generation options from the request body
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // Keep defaults on empty or invalid bodies
  }

  // TODO: plug actual story generation here; for now accept `body.story` if present
  const story: string = typeof body.story === "string" ? body.story : "";

  // Store the summary
  const { data: inserted, error: insertErr } = await sb
    .from("summaries") // Same table name as above
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