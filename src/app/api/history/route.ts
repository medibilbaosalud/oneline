// src/app/api/history/route.ts
// SECURITY: Returns ciphertext/IV pairs only; plaintext never leaves the client.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sb = await supabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await sb.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ entries: [] }, { status: 401 });
  }

  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  let query = sb
    .from('journal')
    .select('id, created_at, day, content_cipher, iv, content')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (from) {
    query = query.gte('day', from);
  }
  if (to) {
    query = query.lte('day', to);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entries: data ?? [] }, { headers: { 'cache-control': 'no-store' } });
}

// SECURITY WARNING: Consumers must decrypt client-side. Losing the passphrase means this data is unreadable forever.
