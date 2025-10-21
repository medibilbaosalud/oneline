// src/app/api/history/[id]/route.ts
// SECURITY: PATCH accepts only ciphertext + IV; DELETE removes the entire encrypted row.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { id: string };

async function resolveParams(params: Params | Promise<Params> | undefined): Promise<Params | null> {
  if (!params) return null;
  try {
    return await Promise.resolve(params);
  } catch {
    return null;
  }
}

export async function PATCH(req: NextRequest, context: { params?: Params | Promise<Params> }) {
  const params = await resolveParams(context.params);
  if (!params?.id) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }
  const { id } = params;
  const sb = await supabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await sb.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: 'sign-in required' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const contentCipher = typeof body?.content_cipher === 'string' ? body.content_cipher : '';
  const iv = typeof body?.iv === 'string' ? body.iv : '';
  if (!contentCipher || !iv) {
    return NextResponse.json({ error: 'missing_cipher' }, { status: 400 });
  }

  const { data, error } = await sb
    .from('journal')
    .update({
      content_cipher: contentCipher,
      iv,
      content: '',
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
}

type JournalRow = { id: string; user_id: string };

function getAdminClient() {
  try {
    return supabaseAdmin();
  } catch (error) {
    console.error('[history/delete] supabase admin unavailable', error);
    return null;
  }
}

export async function DELETE(_req: NextRequest, context: { params?: Params | Promise<Params> }) {
  const params = await resolveParams(context.params);
  if (!params?.id) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }
  const { id } = params;
  const sb = await supabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await sb.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: 'sign-in required' }, { status: 401 });
  }

  const { data: existing, error: existingErr } = await sb
    .from('journal')
    .select('id, user_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle<JournalRow>();

  if (existingErr) {
    return NextResponse.json({ error: existingErr.message }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const admin = getAdminClient();
  const deleter = admin ?? sb;

  const deleteBuilder = deleter
    .from('journal')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle<Pick<JournalRow, 'id'>>();

  const { data: deleted, error: deleteErr } = await deleteBuilder;

  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  if (!deleted) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
}

// SECURITY WARNING: Server never sees decrypted text; clients must handle passphrase safety.
