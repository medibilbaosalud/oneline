import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

import {
  coerceSummaryPreferences,
  computeSummaryReminder,
  isSummaryFrequency,
  type SummaryFrequency,
} from "@/lib/summaryPreferences";

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("user_settings")
    .select("frequency, summary_preferences, last_summary_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const frequency: SummaryFrequency = isSummaryFrequency(data?.frequency) ? data!.frequency : "weekly";
  const preferences = data?.summary_preferences
    ? coerceSummaryPreferences(data.summary_preferences)
    : coerceSummaryPreferences(null);
  const reminder = computeSummaryReminder(frequency, data?.last_summary_at ?? null);

  return NextResponse.json({ ok: true, frequency, preferences, reminder });
}
