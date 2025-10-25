// src/app/api/vault/route.ts
// SECURITY: Stores the wrapped vault key bundle per user. Only ciphertext (wrapped data key) is persisted.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { WrappedBundle } from '@/lib/crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TABLE = 'user_vaults';

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

function resolveDataClient(): SupabaseClient<any> | null {
  try {
    return supabaseAdmin() as SupabaseClient<any>;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[vault] admin client unavailable', error);
    return null;
  }
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

  const dataClient = resolveDataClient() ?? supabase;

  const { data, error } = await dataClient
    .from(TABLE)
    .select('wrapped_b64, iv_b64, salt_b64, version')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[vault] fetch failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ bundle: data ?? null }, { headers: { 'cache-control': 'no-store' } });
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

  const dataClient = resolveDataClient() ?? supabase;

  if (!bundle) {
    const { error } = await dataClient.from(TABLE).delete().eq('user_id', user.id);
    if (error) {
      // eslint-disable-next-line no-console
      console.error('[vault] delete failed', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
  }

  const payload = { user_id: user.id, ...bundle };

  const { error } = await dataClient
    .from(TABLE)
    .upsert(payload, { onConflict: 'user_id' });

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[vault] upsert failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
}

// SECURITY WARNING: Only the wrapped key is persisted. Without the passphrase, the stored bundle is useless.
