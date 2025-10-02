// src/app/api/settings/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

type Body = { frequency?: 'weekly' | 'monthly' | 'yearly' };

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const { data, error } = await supabase
    .from('settings')
    .select('frequency')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ frequency: data?.frequency ?? 'yearly' });
}

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const body = (await req.json()) as Body;
  const { frequency } = body;

  if (frequency && !['weekly', 'monthly', 'yearly'].includes(frequency)) {
    return NextResponse.json({ error: 'invalid frequency' }, { status: 400 });
  }

  const { error } = await supabase
    .from('settings')
    .upsert({ user_id: user.id, frequency }, { onConflict: 'user_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, frequency: frequency ?? null });
}
