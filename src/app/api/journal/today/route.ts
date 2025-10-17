// src/app/api/journal/today/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function ymdUTC(d = new Date()) {
  // convert to UTC date string YYYY-MM-DD
  const iso = new Date(d).toISOString();
  return iso.slice(0, 10);
}

export async function GET() {
  const s = await supabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await s.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const day = ymdUTC();
  const { data, error } = await s
    .from('journal')
    .select('id, content, day, created_at')
    .eq('user_id', user.id)
    .eq('day', day)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? { content: '' }, { headers: { 'cache-control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  const s = await supabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await s.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const body = await req.json();
  const content = String(body?.content ?? '').slice(0, 300).trim();
  if (!content) return NextResponse.json({ error: 'empty' }, { status: 400 });

  const day = ymdUTC();

  // upsert by (user_id, day)
  const { data, error } = await s
    .from('journal')
    .upsert({ user_id: user.id, day, content }, { onConflict: 'user_id,day' })
    .select('id, content, day')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, entry: data }, { headers: { 'cache-control': 'no-store' } });
}
