// src/app/api/generate-story/route.ts
// SECURITY: Accepts decrypted text only when the user has explicitly consented.

import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_SUMMARY_PREFERENCES, isSummaryLanguage } from '@/lib/summaryPreferences';
import { supabaseServer } from '@/lib/supabaseServer';
import { incrementMonthlySummaryUsage } from '@/lib/summaryUsage';
import {
  DAILY_LIMIT_UNITS,
  ensureDailyUsage,
  ensureMinuteUsage,
  remainingUnits,
  type SummaryMode,
  updateDailyUsage,
  usageUnits,
  bumpMinuteUsage,
} from '@/lib/summaryUsageDaily';
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
    return NextResponse.json({ error: 'sign-in required' }, { status: 401 });
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

  const mode: SummaryMode = body?.mode === 'advanced' ? 'advanced' : 'standard';

  const options: YearStoryOptions = {
    length: ['short', 'medium', 'long'].includes(body?.options?.length) ? body.options.length : 'medium',
    tone: coerceTone(body?.options?.tone ?? null),
    pov: coercePov(body?.options?.pov ?? null),
    includeHighlights: body?.options?.includeHighlights !== false,
    pinnedWeight: 2,
    strict: true,
    userNotes: typeof body?.options?.notes === 'string' ? body.options.notes.slice(0, 1000) : undefined,
    language: isSummaryLanguage(body?.options?.language)
      ? body.options.language
      : DEFAULT_SUMMARY_PREFERENCES.language,
  };

  const todayIso = new Date().toISOString().slice(0, 10);

  try {
    const dailyUsage = await ensureDailyUsage(supabase, user.id, todayIso);
    const usedUnits = usageUnits(dailyUsage);
    const cost = mode === 'advanced' ? 2 : 1;

    if (usedUnits + cost > DAILY_LIMIT_UNITS) {
      return NextResponse.json(
        {
          error: 'daily_limit_reached',
          message: 'You have reached today’s summary limit. Please try again tomorrow.',
          usageUnits: usedUnits,
          remainingUnits: 0,
          dailyLimit: DAILY_LIMIT_UNITS,
        },
        { status: 429 },
      );
    }

    const modelName = mode === 'advanced' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    // Align output caps with the target word ranges so MAX_TOKENS does not halt otherwise valid narratives.
    const maxTokens = mode === 'advanced' ? 3200 : 2200;

    // Soft TPM guard to avoid spikes; falls back to a gentle 429 if exceeded.
    const minuteStart = new Date();
    minuteStart.setSeconds(0, 0);
    const minuteIso = minuteStart.toISOString();
    const minuteUsage = await ensureMinuteUsage(supabase, modelName, minuteIso);
    const tpmSoftLimit = mode === 'advanced' ? 80000 : 160000;
    const estimatedTokens = mode === 'advanced' ? 3500 : 2200;
    if (minuteUsage.tokens_used + estimatedTokens > tpmSoftLimit) {
      return NextResponse.json(
        {
          error: 'rate_limited_minute',
          message: 'We are processing too many summaries this minute. Please retry in a moment.',
        },
        { status: 429 },
      );
    }

    const { story, wordCount, tokenUsage } = await generateYearStory(entries, from, to, options, {
      mode,
      modelName,
      maxOutputTokens: maxTokens,
    });
    const consumedTokens = tokenUsage?.totalTokenCount ?? 0;

    const updated = await updateDailyUsage(supabase, dailyUsage, mode, consumedTokens);
    await bumpMinuteUsage(supabase, minuteUsage, consumedTokens);

    await recordSummaryRun({
      supabase,
      userId: user.id,
      story,
      from,
      to,
      entries,
    });

    const usedAfter = usageUnits(updated);

    return NextResponse.json(
      {
        story,
        words: wordCount,
        mode,
        usageUnits: usedAfter,
        remainingUnits: remainingUnits(updated),
        dailyLimit: DAILY_LIMIT_UNITS,
      },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'generation_failed';
    const lowered = typeof message === 'string' ? message.toLowerCase() : '';
    const status = lowered.includes('blocked')
      ? 502
      : lowered.includes('max_tokens') || lowered.includes('empty story')
        ? 422
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// SECURITY WARNING: The server does not retain decrypted entries; the payload is used once to call Gemini.

type SummaryEntry = {
  content: string;
  created_at: string | null;
  day?: string | null;
};

type RecordSummaryRunArgs = {
  supabase: Awaited<ReturnType<typeof supabaseServer>>;
  userId: string;
  story: string;
  from: string;
  to: string;
  entries: SummaryEntry[];
};

async function recordSummaryRun({ supabase, userId, story, from, to, entries }: RecordSummaryRunArgs) {
  const safeStory = story?.trim();
  if (!safeStory) {
    return;
  }

  const fallbackStart = entries[0]?.day ?? entries[0]?.created_at ?? null;
  const fallbackEnd = entries[entries.length - 1]?.day ?? entries[entries.length - 1]?.created_at ?? null;

  const startDate = normalizeDate(from) ?? normalizeDate(fallbackStart) ?? currentIsoDate();
  const endDate = normalizeDate(to) ?? normalizeDate(fallbackEnd) ?? startDate;

  const period = inferPeriod(startDate, endDate);
  const html = storyToHtml(safeStory);

  const { error: insertError } = await supabase
    .from('summaries')
    .insert({
      user_id: userId,
      period,
      start_date: startDate,
      end_date: endDate,
      html,
    })
    .select('id')
    .single();

  if (insertError) {
    throw new Error(insertError.message || 'summary_log_failed');
  }

  try {
    await incrementMonthlySummaryUsage(supabase, userId);
  } catch (error) {
    console.error('Failed to record monthly summary usage', error);
  }
}

function normalizeDate(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const candidate = trimmed.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : null;
}

function currentIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function inferPeriod(startDate: string, endDate: string): 'weekly' | 'monthly' | 'yearly' {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return 'monthly';
  }
  const diffDays = Math.max(0, Math.round((end - start) / (24 * 60 * 60 * 1000)));
  if (diffDays <= 10) return 'weekly';
  if (diffDays <= 62) return 'monthly';
  return 'yearly';
}

function storyToHtml(text: string) {
  const safe = escapeHtml(text);
  if (!safe) {
    return '<p></p>';
  }
  const blocks = safe.split(/\n{2,}/).map((block) => block.replace(/\n/g, '<br />'));
  return blocks.map((block) => `<p>${block}</p>`).join('');
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return char;
    }
  });
}
