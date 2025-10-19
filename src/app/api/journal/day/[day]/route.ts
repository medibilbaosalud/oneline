// src/app/api/journal/day/[day]/route.ts
// SECURITY: Handles encrypted journal entries for specific days. Only ciphertext + IV are stored server-side.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteParams = { day?: string };

type EntryRow = {
  id?: string;
  content_cipher?: string | null;
  iv?: string | null;
  content?: string | null;
};

function ymdUTC(date = new Date()): string {
  const iso = new Date(date).toISOString();
  return iso.slice(0, 10);
}

function isValidDay(value: string | null): value is string {
  if (!value) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime());
}

async function resolveParams(params: RouteParams | Promise<RouteParams>): Promise<RouteParams> {
  try {
    return await Promise.resolve(params);
  } catch {
    return {};
  }
}

async function assertAuthenticated() {
  const client = await supabaseServer();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) {
    return { client, user: null, response: NextResponse.json({ error: 'unauthenticated' }, { status: 401 }) } as const;
  }
  return { client, user, response: null as NextResponse | null } as const;
}

export async function GET(_req: NextRequest, context: { params: RouteParams | Promise<RouteParams> }) {
  const resolved = await resolveParams(context.params ?? {});
  const day = isValidDay(resolved.day ?? null) ? resolved.day! : null;
  if (!day) {
    return NextResponse.json({ error: 'invalid_day' }, { status: 400 });
  }

  const { client, user, response } = await assertAuthenticated();
  if (!user || response) return response;

  const today = ymdUTC();
  if (day > today) {
    return NextResponse.json({ error: 'future_day_not_allowed' }, { status: 400 });
  }

  const { data, error } = await client
    .from('journal')
    .select('id, content_cipher, iv, content')
    .eq('user_id', user.id)
    .eq('day', day)
    .maybeSingle<EntryRow>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? {}, { headers: { 'cache-control': 'no-store' } });
}

export async function POST(req: NextRequest, context: { params: RouteParams | Promise<RouteParams> }) {
  const resolved = await resolveParams(context.params ?? {});
  const day = isValidDay(resolved.day ?? null) ? resolved.day! : null;
  if (!day) {
    return NextResponse.json({ error: 'invalid_day' }, { status: 400 });
  }

  const { client, user, response } = await assertAuthenticated();
  if (!user || response) return response;

  const today = ymdUTC();
  if (day > today) {
    return NextResponse.json({ error: 'future_day_not_allowed' }, { status: 400 });
  }

  const body = await req.json().catch(() => null) as EntryRow | null;
  const contentCipher = typeof body?.content_cipher === 'string' ? body.content_cipher : '';
  const iv = typeof body?.iv === 'string' ? body.iv : '';
  const id = typeof body?.id === 'string' ? body.id : undefined;

  if (!contentCipher || !iv) {
    return NextResponse.json({ error: 'missing_cipher' }, { status: 400 });
  }

  const payload: Record<string, unknown> = {
    user_id: user.id,
    day,
    content_cipher: contentCipher,
    iv,
    version: 1,
    content: '',
  };

  if (id) payload.id = id;

  const { data, error } = await client
    .from('journal')
    .upsert(payload, { onConflict: 'user_id,day' })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data?.id }, { headers: { 'cache-control': 'no-store' } });
}

// SECURITY WARNING: Ciphertext and IV must remain opaque to the server. Never attempt to decrypt without explicit user consent.
