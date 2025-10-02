import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient, createClient } from '@supabase/auth-helpers-nextjs';

type Body = {
  frequency?: 'weekly' | 'monthly' | 'yearly';
  delivery?: 'in_app' | 'email';
  timezone?: string;
  hour_utc?: number; // 0..23
};

export async function GET() {
  const sb = createRouteHandlerClient({ cookies });
  const {
    data: { user },
    error: uErr,
  } = await sb.auth.getUser();
  if (uErr || !user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const { data, error } = await sb
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // si no hay fila aún, devolvemos defaults
  return NextResponse.json(
    data ?? {
      user_id: user.id,
      frequency: 'weekly',
      delivery: 'in_app',
      timezone: 'UTC',
      hour_utc: 7,
      last_summary_at: null,
    }
  );
}

export async function PUT(req: Request) {
  const body = (await req.json()) as Body;
  const sb = createRouteHandlerClient({ cookies });
  const {
    data: { user },
    error: uErr,
  } = await sb.auth.getUser();
  if (uErr || !user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const payload: Record<string, any> = {};
  if (body.frequency) payload.frequency = body.frequency;
  if (body.delivery) payload.delivery = body.delivery;
  if (typeof body.hour_utc === 'number') payload.hour_utc = Math.max(0, Math.min(23, body.hour_utc));
  if (body.timezone) payload.timezone = body.timezone;

  // upsert
  const { error } = await sb.from('user_settings').upsert({ user_id: user.id, ...payload });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
