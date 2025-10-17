import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import {
  coercePov,
  coerceTone,
  generateYearStory,
  type YearStoryOptions,
} from '@/lib/yearStory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = ['fra1', 'cdg1'];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const nowY = new Date().getFullYear();
  const from = url.searchParams.get('from') || `${nowY}-01-01`;
  const to = url.searchParams.get('to') || `${nowY}-12-31`;

  const options: YearStoryOptions = {
    length: (url.searchParams.get('length') as YearStoryOptions['length']) || 'medium',
    tone: coerceTone(url.searchParams.get('tone')),
    pov: coercePov(url.searchParams.get('pov')),
    includeHighlights: url.searchParams.get('highlights') !== 'false',
    pinnedWeight: (Number(url.searchParams.get('pinnedWeight')) as 1 | 2 | 3) || 2,
    strict: url.searchParams.get('strict') !== 'false',
    userNotes: url.searchParams.get('notes') || undefined,
  };

  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const fromIso = `${from}T00:00:00.000Z`;
  const toIso = `${to}T23:59:59.999Z`;

  const { data, error } = await supabase
    .from('journal')
    .select('content, created_at, day')
    .eq('user_id', user.id)
    .gte('created_at', fromIso)
    .lte('created_at', toIso)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'No entries for that range.' }, { status: 400 });
  }

  try {
    const { story, wordCount } = await generateYearStory(data, from, to, options);
    return NextResponse.json({ from, to, options, words: wordCount, story });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
