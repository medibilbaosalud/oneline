// src/app/api/summaries/quota/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { ensureMonthlySummaryWindow } from "@/lib/summaryUsage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sb = await supabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await sb.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  try {
    const now = new Date();
    const { used, startIso, endIso } = await ensureMonthlySummaryWindow(sb, user.id, now);
    const limit = 10;
    const remaining = Math.max(0, limit - used);

    return NextResponse.json(
      {
        limit,
        used,
        remaining,
        period: {
          start: startIso,
          end: endIso,
        },
        resetAt: endIso,
      },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "quota_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
