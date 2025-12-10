// src/app/api/journal/route.ts
import { NextResponse } from 'next/server';
import { supabaseRouteHandler } from '@/lib/supabaseRouteHandler';

export async function GET(req: Request) {
  const url = new URL(req.url);

  const from = url.searchParams.get('from'); // YYYY-MM-DD
  const to = url.searchParams.get('to');   // YYYY-MM-DD
  const limit = Number(url.searchParams.get('limit') ?? '100');

  try {
    const supabase = await supabaseRouteHandler();

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    // Build the query
    let q = supabase
      .from('journal')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (from) q = q.gte('created_at', `${from}T00:00:00.000Z`);
    if (to) q = q.lte('created_at', `${to}T23:59:59.999Z`);

    const { data, error } = await q;
    if (error) throw error;

    return NextResponse.json({ items: data ?? [] });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
