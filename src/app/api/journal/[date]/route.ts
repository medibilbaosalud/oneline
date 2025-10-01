import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

const MAX_LINES = 5;
const MAX_CHARS = 240;

function isValidISO(d: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}
function isFuture(d: string) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const target = new Date(d + 'T00:00:00');
  return target.getTime() > today.getTime();
}
function validateContent(raw: string) {
  const lines = raw.replace(/\r/g, '').split('\n');
  if (lines.length > MAX_LINES) return false;
  if (raw.length > MAX_CHARS) return false;
  return true;
}

export async function GET(
  _req: Request,
  { params }: { params: { date: string } }
) {
  const { date } = params;
  if (!isValidISO(date)) return NextResponse.json({ error: 'Bad date' }, { status: 400 });

  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('entries')
    .select('content, updated_at')
    .eq('user_id', user.id)
    .eq('date', date)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ content: data?.content ?? '' });
}

export async function POST(
  req: Request,
  { params }: { params: { date: string } }
) {
  const { date } = params;
  if (!isValidISO(date)) return NextResponse.json({ error: 'Bad date' }, { status: 400 });
  if (isFuture(date)) return NextResponse.json({ error: 'Future not allowed' }, { status: 400 });

  const { content } = await req.json();
  const safe = (content ?? '').toString().replace(/\r/g, '');
  if (!validateContent(safe)) {
    return NextResponse.json({ error: 'Limits exceeded' }, { status: 422 });
  }

  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('entries')
    .upsert({ user_id: user.id, date, content: safe }, { onConflict: 'user_id,date' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
