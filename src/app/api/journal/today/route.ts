// src/app/api/journal/today/route.ts
// SECURITY: This route never receives plaintext journal content; it stores only ciphertext + IV per user/day.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function ymdUTC(d = new Date()) {
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
    .select('id, content_cipher, iv, content')
    .eq('user_id', user.id)
    .eq('day', day)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? {}, { headers: { 'cache-control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  const s = await supabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await s.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const contentCipher = typeof body?.content_cipher === 'string' ? body.content_cipher : '';
  const iv = typeof body?.iv === 'string' ? body.iv : '';
  if (!contentCipher || !iv) {
    return NextResponse.json({ error: 'missing_cipher' }, { status: 400 });
  }

  const day = ymdUTC();
  const payload: Record<string, unknown> = {
    user_id: user.id,
    day,
    content_cipher: contentCipher,
    iv,
    content: '',
    version: 1,
  };
  if (typeof body?.id === 'string' && body.id) {
    payload.id = body.id;
  }

  const { data, error } = await s
    .from('journal')
    .upsert(payload, { onConflict: 'user_id,day' })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: data?.id }, { headers: { 'cache-control': 'no-store' } });
}

// SECURITY WARNING: Ciphertext is stored exactly as received. Never attempt to decrypt on the server without explicit user consent.
