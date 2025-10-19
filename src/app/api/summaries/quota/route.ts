// src/app/api/summaries/quota/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function monthWindowUTC(d = new Date()) {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0));
  return { start, end };
}

export async function GET() {
  const sb = await supabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await sb.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { start, end } = monthWindowUTC();
  const { count, error } = await sb
    .from("summaries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const limit = 10;
  const used = count ?? 0;
  const remaining = Math.max(0, limit - used);

  return NextResponse.json(
    {
      limit,
      used,
      remaining,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      resetAt: end.toISOString(),
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}
