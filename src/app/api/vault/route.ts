// src/app/api/vault/route.ts
// SECURITY: Stores the wrapped vault key bundle per user. Only ciphertext (wrapped data key) is persisted.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import type { WrappedBundle } from '@/lib/crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TABLE = 'user_vaults';
const STATUS_TABLE = 'user_vault_status';

function normalizeBundle(input: unknown): WrappedBundle | null {
  if (!input || typeof input !== 'object') return null;
  const candidate = input as Record<string, unknown>;
  const wrapped = typeof candidate.wrapped_b64 === 'string' ? candidate.wrapped_b64 : null;
  const iv = typeof candidate.iv_b64 === 'string' ? candidate.iv_b64 : null;
  const salt = typeof candidate.salt_b64 === 'string' ? candidate.salt_b64 : null;
  const version = typeof candidate.version === 'number' ? candidate.version : 1;
  if (!wrapped || !iv || !salt) return null;
  return { wrapped_b64: wrapped, iv_b64: iv, salt_b64: salt, version };
}

export async function GET() {
  const supabase = await supabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'sign-in required' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select('wrapped_b64, iv_b64, salt_b64, version')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: statusRow } = await supabase
    .from(STATUS_TABLE)
    .select('has_passphrase')
    .eq('user_id', user.id)
    .maybeSingle();

  const hasVault = !!data || statusRow?.has_passphrase === true;

  return NextResponse.json({ bundle: data ?? null, hasVault }, { headers: { 'cache-control': 'no-store' } });
}

export async function PUT(request: NextRequest) {
  const supabase = await supabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'sign-in required' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const bundle = normalizeBundle(body?.bundle ?? null);

  if (!bundle) {
    await supabase.from(TABLE).delete().eq('user_id', user.id);
    await supabase
      .from(STATUS_TABLE)
      .upsert({ user_id: user.id, has_passphrase: false })
      .eq('user_id', user.id);
    return NextResponse.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
  }

  const { error } = await supabase
    .from(TABLE)
    .upsert({ user_id: user.id, ...bundle })
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase
    .from(STATUS_TABLE)
    .upsert({ user_id: user.id, has_passphrase: true })
    .eq('user_id', user.id);

  return NextResponse.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
}

// SECURITY WARNING: Only the wrapped key is persisted. Without the passphrase, the stored bundle is useless.
