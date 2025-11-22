import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

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
  const supabase = createRouteHandlerClient({ cookies });
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
    const { count, error: countError } = await supabase
      .from("journal")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.user.id)
      .gte("day", start)
      .lte("day", end);

    if (!countError) {
      const minimumMet = (count ?? 0) >= MIN_WEEKLY_ENTRIES;
      reminder = {
        ...reminderBase,
        due: reminderBase.due && minimumMet,
        entryCount: count ?? 0,
        minimumRequired: MIN_WEEKLY_ENTRIES,
        minimumMet,
      };
    }
  }

  return NextResponse.json({ ok: true, frequency, preferences, reminder });
}
