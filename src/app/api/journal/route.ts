// src/app/api/journal/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET(req: Request) {
  const url = new URL(req.url);

  const from = url.searchParams.get('from'); // YYYY-MM-DD
  const to   = url.searchParams.get('to');   // YYYY-MM-DD
  const limit = Number(url.searchParams.get('limit') ?? '100');

  // Add cursor pagination here in the future if needed
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    // Construimos el query
    let q = supabase
      .from('journal')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (from) q = q.gte('created_at', `${from}T00:00:00.000Z`);
    if (to)   q = q.lte('created_at',   `${to}T23:59:59.999Z`);

    const { data, error } = await q;
    if (error) throw error;

    return NextResponse.json({ items: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
