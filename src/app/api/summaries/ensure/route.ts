import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

import { isSummaryFrequency, type SummaryFrequency } from "@/lib/summaryPreferences";

const TABLE = "user_vaults";

function startEndOfCurrent(period: "weekly"|"monthly"|"yearly") {
  const now = new Date();
  let start = new Date(now), end = new Date(now);

  if (period === "weekly") {
    const day = now.getUTCDay(); // 0..6
    const diffToMonday = (day + 6) % 7; // Monday = 0
    start.setUTCDate(now.getUTCDate() - diffToMonday);
    start.setUTCHours(0,0,0,0);
    end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    end.setUTCHours(23,59,59,999);
  } else if (period === "monthly") {
    start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23,59,59,999));
  } else {
    start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    end = new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23,59,59,999));
  }
  return { start, end };
}

export async function POST() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  // 1) read the configured frequency
  const { data: settings } = await supabase
    .from(TABLE)
    .select("frequency, digest_frequency")
    .eq("user_id", user.id)
    .maybeSingle();

  const frequencySource = settings?.digest_frequency ?? settings?.frequency;
  const period: SummaryFrequency = isSummaryFrequency(frequencySource) ? frequencySource : "weekly";

  const { start, end } = startEndOfCurrent(period);

  // 2) fetch entries for the period
  const { data: entries, error: jErr } = await supabase
    .from("journal")
    .select("content, created_at")
    .eq("user_id", user.id)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString())
    .order("created_at", { ascending: true });

  if (jErr) return NextResponse.json({ ok: false, error: jErr }, { status: 500 });

  if (!entries || entries.length === 0) {
    return NextResponse.json({ ok: true, created: false, reason: "No entries" });
  }

  // 3) compose a very simple HTML payload
  const list = entries.map(e => {
    const d = new Date(e.created_at).toISOString().slice(0,10);
    return `<li><strong>${d}</strong>: ${escapeHtml(e.content)}</li>`;
  }).join("");
  const html = `<h2>${period} summary</h2><ul>${list}</ul>`;

  // 4) save the summary
  const { error: sErr } = await supabase.from("summaries").insert({
    user_id: user.id,
    period, start_date: start.toISOString().slice(0,10), end_date: end.toISOString().slice(0,10),
    html
  });

  if (sErr) return NextResponse.json({ ok: false, error: sErr }, { status: 500 });
  return NextResponse.json({ ok: true, created: true });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => (
    { "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" } as any
  )[c]);
}
