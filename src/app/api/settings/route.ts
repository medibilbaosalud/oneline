import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import {
  DEFAULT_SUMMARY_PREFERENCES,
  coerceSummaryPreferences,
  computeSummaryReminder,
  isSummaryFrequency,
  withSummaryLength,
  type SummaryFrequency,
  type SummaryPreferences,
} from "@/lib/summaryPreferences";
import type { JournalDigestFreq, JournalStoryLength } from "@/types/journal";

type RawSettingsRow = {
  frequency: JournalDigestFreq | null;
  digest_frequency: JournalDigestFreq | null;
  story_length: JournalStoryLength | null;
  summary_preferences: unknown;
  last_summary_at: string | null;
};

async function resolveSettings(userId: string) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data, error } = await supabase
    .from("user_settings")
    .select("frequency, digest_frequency, story_length, summary_preferences, last_summary_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "settings_fetch_failed");
  }

  const row = (data ?? null) as RawSettingsRow | null;

  const frequencySource = row?.digest_frequency ?? row?.frequency;
  const frequency: SummaryFrequency = isSummaryFrequency(frequencySource)
    ? frequencySource
    : "weekly";

  const basePreferences = row?.summary_preferences
    ? coerceSummaryPreferences(row.summary_preferences)
    : { ...DEFAULT_SUMMARY_PREFERENCES };

  const summaryPreferences = withSummaryLength(
    basePreferences,
    row?.story_length ?? basePreferences.length,
  );

  return {
    frequency,
    summaryPreferences,
    lastSummaryAt: row?.last_summary_at ?? null,
  };
}

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  try {
    const settings = await resolveSettings(user.id);
    const reminder = computeSummaryReminder(settings.frequency, settings.lastSummaryAt);

    return NextResponse.json({
      ok: true,
      settings: {
        frequency: settings.frequency,
        storyPreferences: settings.summaryPreferences,
        lastSummaryAt: settings.lastSummaryAt,
        reminder,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "settings_fetch_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

type UpdatePayload = {
  frequency?: SummaryFrequency;
  storyPreferences?: Partial<SummaryPreferences> | null;
};

export async function PUT(req: Request) {
  const body = (await req.json().catch(() => null)) as UpdatePayload | null;

  if (!body || (!body.frequency && !body.storyPreferences)) {
    return NextResponse.json({ ok: false, error: "no_changes" }, { status: 400 });
  }

  if (body.frequency && !isSummaryFrequency(body.frequency)) {
    return NextResponse.json({ ok: false, error: "invalid_frequency" }, { status: 400 });
  }

  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  try {
    const current = await resolveSettings(user.id);

    const nextFrequency = body.frequency ?? current.frequency;
    const nextPreferences = body.storyPreferences
      ? coerceSummaryPreferences(body.storyPreferences)
      : current.summaryPreferences;
    const nextStoryLength: JournalStoryLength = nextPreferences.length;

    const { data, error } = await supabase
      .from("user_settings")
      .upsert(
        {
          user_id: user.id,
          frequency: nextFrequency,
          digest_frequency: nextFrequency,
          story_length: nextStoryLength,
          summary_preferences: nextPreferences,
        },
        { onConflict: "user_id" },
      )
      .select("frequency, digest_frequency, story_length, summary_preferences, last_summary_at")
      .maybeSingle();

    if (error) {
      throw new Error(error.message || "settings_update_failed");
    }

    const row = (data ?? null) as RawSettingsRow | null;

    const frequencySource = row?.digest_frequency ?? row?.frequency;
    const savedFrequency = isSummaryFrequency(frequencySource) ? frequencySource : nextFrequency;
    const savedPreferencesBase = row?.summary_preferences
      ? coerceSummaryPreferences(row.summary_preferences)
      : nextPreferences;
    const savedPreferences = withSummaryLength(
      savedPreferencesBase,
      row?.story_length ?? nextStoryLength,
    );

    const reminder = computeSummaryReminder(
      savedFrequency,
      row?.last_summary_at ?? current.lastSummaryAt,
    );

    return NextResponse.json({
      ok: true,
      settings: {
        frequency: savedFrequency,
        storyPreferences: savedPreferences,
        lastSummaryAt: row?.last_summary_at ?? current.lastSummaryAt,
        reminder,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "settings_update_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
