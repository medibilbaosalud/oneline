import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LOOKBACK_DAYS = 365;
const MILESTONES = [1, 7, 21, 60, 120, 240, 365];

function ymd(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(base: Date, offset: number) {
  const copy = new Date(base);
  copy.setUTCDate(copy.getUTCDate() + offset);
  return copy;
}

function diffInDays(a: string, b: string) {
  const da = new Date(`${a}T00:00:00Z`).valueOf();
  const db = new Date(`${b}T00:00:00Z`).valueOf();
  const diff = Math.round((da - db) / (24 * 60 * 60 * 1000));
  return diff;
}

export async function GET() {
  const supabase = await supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const today = new Date();
  const lowerBound = addDays(today, -LOOKBACK_DAYS);

  const { data, error } = await supabase
    .from('journal')
    .select('day')
    .eq('user_id', user.id)
    .gte('day', ymd(lowerBound))
    .order('day', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const days = (data ?? [])
    .map((row) => row.day)
    .filter((day): day is string => typeof day === 'string');
  const daySet = new Set(days);
  const todayKey = ymd(today);

  // Current streak — count consecutive days ending today.
  let current = 0;
  let cursor = todayKey;
  while (daySet.has(cursor)) {
    current += 1;
    cursor = ymd(addDays(new Date(`${cursor}T00:00:00Z`), -1));
  }

  // Longest streak — scan chronologically.
  const sorted = [...daySet].sort();
  let longest = 0;
  let streak = 0;
  let prev: string | null = null;
  for (const day of sorted) {
    if (!prev) {
      streak = 1;
    } else {
      const gap = diffInDays(day, prev);
      streak = gap === 1 ? streak + 1 : 1;
    }
    longest = Math.max(longest, streak);
    prev = day;
  }
  longest = Math.max(longest, current);

  const nextMilestone = MILESTONES.find((m) => m > current) ?? null;
  const progress = nextMilestone ? Math.min(current / nextMilestone, 1) : 1;

  return NextResponse.json(
    {
      current,
      longest,
      nextMilestone,
      progress,
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
