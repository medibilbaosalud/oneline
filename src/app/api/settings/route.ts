import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import {
  DEFAULT_SUMMARY_PREFERENCES,
  coerceSummaryPreferences,
  computeSummaryReminder,
  isSummaryFrequency,
  type SummaryFrequency,
  type SummaryPreferences,
} from "@/lib/summaryPreferences";

type RawSettingsRow = {
  frequency: SummaryFrequency | null;
  summary_preferences: unknown;
  last_summary_at: string | null;
};

async function resolveSettings(userId: string) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data, error } = await supabase
    .from("user_settings")
    .select("frequency, summary_preferences, last_summary_at")
    .eq("user_id", userId)
    .maybeSingle<RawSettingsRow>();

  if (error) {
    throw new Error(error.message || "settings_fetch_failed");
  }

  const frequency: SummaryFrequency = isSummaryFrequency(data?.frequency)
    ? data!.frequency
    : "weekly";

  const summaryPreferences = data?.summary_preferences
    ? coerceSummaryPreferences(data.summary_preferences)
    : { ...DEFAULT_SUMMARY_PREFERENCES };

  return {
    frequency,
    summaryPreferences,
    lastSummaryAt: data?.last_summary_at ?? null,
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

    const { data, error } = await supabase
      .from("user_settings")
      .upsert(
        {
          user_id: user.id,
          frequency: nextFrequency,
          summary_preferences: nextPreferences,
        },
        { onConflict: "user_id" },
      )
      .select<RawSettingsRow>("frequency, summary_preferences, last_summary_at")
      .maybeSingle();

    if (error) {
      throw new Error(error.message || "settings_update_failed");
    }

    const savedFrequency = isSummaryFrequency(data?.frequency) ? data!.frequency : nextFrequency;
    const savedPreferences = data?.summary_preferences
      ? coerceSummaryPreferences(data.summary_preferences)
      : nextPreferences;

    const reminder = computeSummaryReminder(savedFrequency, data?.last_summary_at ?? current.lastSummaryAt);

    return NextResponse.json({
      ok: true,
      settings: {
        frequency: savedFrequency,
        storyPreferences: savedPreferences,
        lastSummaryAt: data?.last_summary_at ?? current.lastSummaryAt,
        reminder,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "settings_update_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
