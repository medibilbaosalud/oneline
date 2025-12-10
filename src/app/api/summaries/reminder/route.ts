import { NextResponse } from "next/server";
import { supabaseRouteHandler } from "@/lib/supabaseRouteHandler";

import {
  coerceSummaryPreferences,
  computeSummaryReminder,
  isSummaryFrequency,
  withSummaryLength,
  type SummaryFrequency,
} from "@/lib/summaryPreferences";

const MIN_WEEKLY_ENTRIES = 4;

const TABLE = "user_vaults";

export async function GET() {
  try {
    const supabase = await supabaseRouteHandler();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }

    const { data, error: queryError } = await supabase
      .from(TABLE)
      .select("frequency, digest_frequency, story_length, summary_preferences, last_summary_at")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (queryError) {
      return NextResponse.json({ ok: false, error: queryError.message }, { status: 500 });
    }

    const frequencySource = data?.digest_frequency ?? data?.frequency;
    const frequency: SummaryFrequency = isSummaryFrequency(frequencySource) ? frequencySource : "weekly";
    const basePreferences = data?.summary_preferences
      ? coerceSummaryPreferences(data.summary_preferences)
      : coerceSummaryPreferences(null);
    const preferences = withSummaryLength(
      basePreferences,
      data?.story_length ?? basePreferences.length,
    );
    const reminderBase = computeSummaryReminder(frequency, data?.last_summary_at ?? null);

    let reminder = reminderBase;
    if (frequency === "weekly") {
      const { start, end } = reminderBase.window;
      const { data: rows, error: countError } = await supabase
        .from("journal")
        .select("day, created_at")
        .eq("user_id", session.user.id)
        .gte("day", start)
        .lte("day", end)
        .limit(50);

      if (!countError && rows) {
        const uniqueDays = new Set<string>();
        for (const row of rows) {
          const day = row.day ?? row.created_at?.slice(0, 10);
          if (day) uniqueDays.add(day);
        }

        const dayCount = uniqueDays.size;
        const minimumMet = dayCount >= MIN_WEEKLY_ENTRIES;
        reminder = {
          ...reminderBase,
          due: reminderBase.due && minimumMet,
          entryCount: dayCount,
          minimumRequired: MIN_WEEKLY_ENTRIES,
          minimumMet,
        };
      }
    }

    return NextResponse.json({ ok: true, frequency, preferences, reminder });
  } catch (error) {
    console.error("[summaries-reminder] unexpected", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
