import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

import {
  coerceSummaryPreferences,
  computeSummaryReminder,
  isSummaryFrequency,
  withSummaryLength,
  type SummaryFrequency,
} from "@/lib/summaryPreferences";

const TABLE = "user_vaults";

export async function GET() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select("frequency, digest_frequency, story_length, summary_preferences, last_summary_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
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
  const reminder = computeSummaryReminder(frequency, data?.last_summary_at ?? null);

  return NextResponse.json({ ok: true, frequency, preferences, reminder });
}
