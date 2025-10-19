import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use the Service Role key to write summaries and update last_summary_at
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Vercel adds this header to scheduled invocations
function isFromVercelCron(req: Request) {
  return req.headers.get('x-vercel-cron') === '1';
}

function isDue(
  freq: 'weekly' | 'monthly' | 'yearly',
  last: string | null,
  now: Date
) {
  if (!last) return true;
  const prev = new Date(last);
  const ms = now.getTime() - prev.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (freq === 'weekly') return ms >= 7 * day;
  if (freq === 'monthly') return now.getUTCMonth() !== prev.getUTCMonth() || now.getUTCFullYear() !== prev.getUTCFullYear();
  return now.getUTCFullYear() !== prev.getUTCFullYear();
}

export async function GET(req: Request) {
  if (!isFromVercelCron(req)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const sb = createClient(url, serviceKey);
  const now = new Date();
  const currentHour = now.getUTCHours();

  // Fetch user preferences
  const { data: settings, error } = await sb
    .from('user_settings')
    .select('user_id, frequency, delivery, hour_utc, last_summary_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let done = 0;
  for (const s of settings ?? []) {
    if (s.hour_utc !== currentHour) continue;
    if (!isDue(s.frequency, s.last_summary_at, now)) continue;

    // Compute the date window for the selected frequency
    let start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    let end = new Date(start);
    if (s.frequency === 'weekly') start = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (s.frequency === 'monthly') start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, now.getUTCDate()));
    if (s.frequency === 'yearly') start = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate()));

    // Read journal entries for that period
    const { data: entries } = await sb
      .from('entries')
      .select('content, entry_date')
      .eq('user_id', s.user_id)
      .gte('entry_date', start.toISOString().slice(0, 10))
      .lt('entry_date', end.toISOString().slice(0, 10))
      .order('entry_date', { ascending: true });

    // Compose a simple summary (wire Gemini here if desired)
    const content = (entries ?? [])
      .map((e) => `• ${e.entry_date}: ${e.content}`)
      .join('\n')
      || 'No entries in this period.';

    // Persist the summary
    await sb.from('entries_summaries').insert({
      user_id: s.user_id,
      frequency: s.frequency,
      period_start: start.toISOString().slice(0, 10),
      period_end: end.toISOString().slice(0, 10),
      content,
    });

    // Mark the last summary timestamp
    await sb.from('user_settings').update({ last_summary_at: now.toISOString() }).eq('user_id', s.user_id);

    // If s.delivery === 'email', send it via your mail provider here
    done++;
  }

  return NextResponse.json({ ok: true, generated: done });
}
