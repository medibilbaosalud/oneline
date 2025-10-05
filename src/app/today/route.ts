// src/app/api/journal/today/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

function ymd(d = new Date()) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function GET() {
  const sb = createRouteHandlerClient({ cookies });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ content: '' });

  const { data, error } = await sb
    .from('journal')
    .select('content')
    .eq('user_id', user.id)
    .eq('day', ymd())
    .maybeSingle();

  if (error) return NextResponse.json({ content: '' });
  return NextResponse.json({ content: data?.content ?? '' });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const content = (body?.content ?? '').toString();

  if (!content.trim()) {
    return NextResponse.json({ error: 'Empty content' }, { status: 400 });
  }
  if (content.length > 180) {
    return NextResponse.json({ error: 'Too long' }, { status: 422 });
  }

  const sb = createRouteHandlerClient({ cookies });
  const { data: { user } }
