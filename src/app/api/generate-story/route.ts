// src/app/api/generate-story/route.ts
// SECURITY: Accepts decrypted text only when the user has explicitly consented.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import {
  coercePov,
  coerceTone,
  generateYearStory,
  type YearStoryEntry,
  type YearStoryOptions,
} from '@/lib/yearStory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const supabase = await supabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || body.consent !== true) {
    return NextResponse.json({ error: 'consent_required' }, { status: 400 });
  }

  const rawEntries = Array.isArray(body.entries) ? (body.entries as YearStoryEntry[]) : [];
  const entries = rawEntries
    .map((entry) => ({
      content: String(entry?.content ?? '').slice(0, 2000),
      created_at: typeof entry?.created_at === 'string' ? entry.created_at : null,
      day: typeof entry?.day === 'string' ? entry.day : null,
    }))
    .filter((entry) => entry.content.trim().length > 0);

  if (entries.length === 0) {
    return NextResponse.json({ error: 'no_entries' }, { status: 400 });
  }

  const from = typeof body.from === 'string' ? body.from : entries[0].day ?? entries[0].created_at?.slice(0, 10) ?? '';
  const to =
    typeof body.to === 'string'
      ? body.to
      : entries[entries.length - 1].day ?? entries[entries.length - 1].created_at?.slice(0, 10) ?? '';

  const options: YearStoryOptions = {
    length: ['short', 'medium', 'long'].includes(body?.options?.length) ? body.options.length : 'medium',
    tone: coerceTone(body?.options?.tone ?? null),
    pov: coercePov(body?.options?.pov ?? null),
    includeHighlights: body?.options?.includeHighlights !== false,
    pinnedWeight: 2,
    strict: true,
    userNotes: typeof body?.options?.notes === 'string' ? body.options.notes.slice(0, 1000) : undefined,
  };

  try {
    const { story, wordCount } = await generateYearStory(entries, from, to, options);
    return NextResponse.json(
      {
        story,
        words: wordCount,
      },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'generation_failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// SECURITY WARNING: The server does not retain decrypted entries; the payload is used once to call Gemini.
