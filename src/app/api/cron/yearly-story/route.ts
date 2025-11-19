import { NextResponse } from 'next/server';

import { DEFAULT_SUMMARY_PREFERENCES, coerceSummaryPreferences, isSummaryLength } from '@/lib/summaryPreferences';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { incrementMonthlySummaryUsage } from '@/lib/summaryUsage';
import { generateYearStory, type YearStoryOptions } from '@/lib/yearStory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const defaultOptions: YearStoryOptions = {
  length: 'long',
  tone: 'auto',
  pov: 'auto',
  includeHighlights: true,
  pinnedWeight: 2,
  strict: true,
  language: DEFAULT_SUMMARY_PREFERENCES.language,
};

function isFromVercelCron(req: Request) {
  return req.headers.get('x-vercel-cron') === '1';
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

function formatInline(text: string) {
  const escaped = escapeHtml(text);
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

function markdownishToHtml(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const html: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      closeList();
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${formatInline(line.replace(/^[-*]\s+/, ''))}</li>`);
      continue;
    }

    closeList();

    if (/^#{1,6}\s/.test(line)) {
      const level = Math.min(6, line.match(/^#{1,6}/)?.[0].length ?? 3);
      const content = line.replace(/^#{1,6}\s*/, '');
      html.push(`<h${level}>${formatInline(content)}</h${level}>`);
      continue;
    }

    html.push(`<p>${formatInline(line).replace(/\n/g, '<br/>')}</p>`);
  }

  closeList();
  return html.join('\n');
}

function previousFullYearRange(now = new Date()) {
  const year = now.getUTCFullYear() - 1;
  return {
    from: `${year}-01-01`,
    to: `${year}-12-31`,
  };
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : 'Unknown error';
}

export async function GET(req: Request) {
  if (!isFromVercelCron(req)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let supabase;
  try {
    supabase = supabaseAdmin();
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }

  const { from, to } = previousFullYearRange();

  const { data: userRows, error: usersError } = await supabase
    .from('journal')
    .select('user_id')
    .gte('day', from)
    .lte('day', to);

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  const userIds = Array.from(new Set((userRows ?? []).map((row) => row.user_id).filter(Boolean)));

  const settingsMap = new Map<
    string,
    { story_length: string | null; summary_preferences: unknown }
  >();

  if (userIds.length > 0) {
    const { data: settingsRows, error: settingsError } = await supabase
      .from('user_vaults')
      .select('user_id, story_length, summary_preferences')
      .in('user_id', userIds);

    if (settingsError) {
      return NextResponse.json({ error: settingsError.message }, { status: 500 });
    }

    for (const row of settingsRows ?? []) {
      if (row?.user_id) {
        settingsMap.set(row.user_id, {
          story_length: row.story_length ?? null,
          summary_preferences: row.summary_preferences ?? null,
        });
      }
    }
  }

  let generated = 0;
  const skipped: string[] = [];

  for (const userId of userIds) {
    try {
      const { data: existing } = await supabase
        .from('summaries')
        .select('id')
        .eq('user_id', userId)
        .eq('period', 'yearly')
        .eq('start_date', from)
        .eq('end_date', to)
        .maybeSingle();

      if (existing) {
        skipped.push(userId);
        continue;
      }

      const { data: entries, error: entriesError } = await supabase
        .from('journal')
        .select('content, created_at, day')
        .eq('user_id', userId)
        .gte('day', from)
        .lte('day', to)
        .order('day', { ascending: true });

      if (entriesError) {
        throw new Error(entriesError.message);
      }

      if (!entries || entries.length === 0) {
        skipped.push(userId);
        continue;
      }

      const settings = settingsMap.get(userId) ?? null;
      const basePreferences = settings?.summary_preferences
        ? coerceSummaryPreferences(settings.summary_preferences)
        : { ...DEFAULT_SUMMARY_PREFERENCES };
      const preferredLength = settings?.story_length;
      const options: YearStoryOptions = {
        ...defaultOptions,
        length: isSummaryLength(preferredLength) ? preferredLength : basePreferences.length,
        tone: basePreferences.tone,
        pov: basePreferences.pov,
        includeHighlights: basePreferences.includeHighlights,
        userNotes: basePreferences.notes ?? undefined,
        language: basePreferences.language,
      };

      const { story } = await generateYearStory(entries, from, to, options);
      const html = markdownishToHtml(story);

      const { error: insertError } = await supabase.from('summaries').insert({
        user_id: userId,
        period: 'yearly',
        start_date: from,
        end_date: to,
        html,
      });

      if (insertError) {
        throw new Error(insertError.message);
      }

      try {
        await incrementMonthlySummaryUsage(supabase, userId);
      } catch (error) {
        console.error('Failed to bump monthly usage from cron', { userId, error });
      }

      generated += 1;
    } catch (error) {
      skipped.push(`${userId}:${errorMessage(error)}`);
    }
  }

  return NextResponse.json({ ok: true, from, to, generated, skipped });
}
