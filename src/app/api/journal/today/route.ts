// src/app/api/journal/today/route.ts
// SECURITY: This route never receives plaintext journal content; it stores only ciphertext + IV per user/day.

import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function ymdUTC(d = new Date()) {
  const iso = new Date(d).toISOString();
  return iso.slice(0, 10);
}

// Helper to get Supabase client with proper cookie handling for Next.js 15
async function getSupabase() {
  const cookieStore = await cookies();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createServerComponentClient({ cookies: () => cookieStore as any });
}

export async function GET() {
  try {
    const supabase = await getSupabase();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error || !session?.user) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    }

    const day = ymdUTC();
    const { data, error: fetchError } = await supabase
      .from('journal')
      .select('id, content_cipher, iv, content')
      .eq('user_id', session.user.id)
      .eq('day', day)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    return NextResponse.json(data ?? {}, { headers: { 'cache-control': 'no-store' } });
  } catch (e) {
    console.error('[/api/journal/today GET] Error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabase();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error || !session?.user) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const contentCipher = typeof body?.content_cipher === 'string' ? body.content_cipher : '';
    const iv = typeof body?.iv === 'string' ? body.iv : '';
    if (!contentCipher || !iv) {
      return NextResponse.json({ error: 'missing_cipher' }, { status: 400 });
    }

    const day = ymdUTC();
    const payload: Record<string, unknown> = {
      user_id: session.user.id,
      day,
      content_cipher: contentCipher,
      iv,
      content: '',
      version: 1,
    };
    if (typeof body?.id === 'string' && body.id) {
      payload.id = body.id;
    }

    const { data, error: upsertError } = await supabase
      .from('journal')
      .upsert(payload, { onConflict: 'user_id,day' })
      .select('id')
      .single();

    if (upsertError) {
      console.error('[/api/journal/today POST] Upsert error:', upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data?.id }, { headers: { 'cache-control': 'no-store' } });
  } catch (e) {
    console.error('[/api/journal/today POST] Error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// SECURITY WARNING: Ciphertext is stored exactly as received. Never attempt to decrypt on the server without explicit user consent.
