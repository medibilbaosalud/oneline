import type { SupabaseClient } from "@supabase/supabase-js";

import { DEFAULT_SUMMARY_PREFERENCES } from "./summaryPreferences";

type ServerClient = SupabaseClient<Record<string, unknown>, "public", Record<string, unknown>>;

export function monthStartIso(date = new Date()): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString();
}

export function monthEndIso(date = new Date()): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)).toISOString();
}

export function isSameMonthCycle(candidate: string | null | undefined, reference = new Date()): boolean {
  if (!candidate) return false;
  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) return false;
  return (
    parsed.getUTCFullYear() === reference.getUTCFullYear() &&
    parsed.getUTCMonth() === reference.getUTCMonth()
  );
}

export async function incrementMonthlySummaryUsage(
  client: ServerClient,
  userId: string,
  now = new Date(),
): Promise<void> {
  const startIso = monthStartIso(now);
  const { data, error } = await client
    .from("user_settings")
    .select("summary_month_count, summary_month_started_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const sameCycle = isSameMonthCycle(data?.summary_month_started_at ?? null, now);
  const nextCount = (sameCycle ? data?.summary_month_count ?? 0 : 0) + 1;
  const payload = {
    last_summary_at: now.toISOString(),
    summary_month_count: nextCount,
    summary_month_started_at: sameCycle ? data?.summary_month_started_at ?? startIso : startIso,
  };

  if (data) {
    const { error: updateErr } = await client
      .from("user_settings")
      .update(payload)
      .eq("user_id", userId);
    if (updateErr) {
      throw new Error(updateErr.message);
    }
    return;
  }

  const { error: insertErr } = await client.from("user_settings").insert({
    user_id: userId,
    frequency: "weekly",
    summary_preferences: DEFAULT_SUMMARY_PREFERENCES,
    ...payload,
  });

  if (insertErr) {
    throw new Error(insertErr.message);
  }
}

export async function ensureMonthlySummaryWindow(
  client: ServerClient,
  userId: string,
  now = new Date(),
): Promise<{ used: number; startIso: string; endIso: string }> {
  const startIso = monthStartIso(now);
  const endIso = monthEndIso(now);

  const { data, error } = await client
    .from("user_settings")
    .select("summary_month_count, summary_month_started_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    const { error: seedErr } = await client.from("user_settings").insert({
      user_id: userId,
      frequency: "weekly",
      summary_preferences: DEFAULT_SUMMARY_PREFERENCES,
      summary_month_count: 0,
      summary_month_started_at: startIso,
    });
    if (seedErr) {
      throw new Error(seedErr.message);
    }
    return { used: 0, startIso, endIso };
  }

  if (!isSameMonthCycle(data.summary_month_started_at ?? null, now)) {
    const { error: resetErr } = await client
      .from("user_settings")
      .update({
        summary_month_count: 0,
        summary_month_started_at: startIso,
      })
      .eq("user_id", userId);
    if (resetErr) {
      throw new Error(resetErr.message);
    }
    return { used: 0, startIso, endIso };
  }

  return {
    used: data.summary_month_count ?? 0,
    startIso: data.summary_month_started_at ?? startIso,
    endIso,
  };
}
