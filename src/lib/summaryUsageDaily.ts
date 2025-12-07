import type { SupabaseClient } from "@supabase/supabase-js";

export type SummaryMode = "standard" | "advanced";

export type SummaryDailyUsageRow = {
  id: number;
  user_id: string;
  date: string;
  standard_uses: number;
  advanced_uses: number;
  total_tokens: number;
};

export type SummaryMinuteUsageRow = {
  id: number;
  model: string;
  minute_start: string;
  tokens_used: number;
};

export const DAILY_LIMIT_UNITS = 40;
export const WEEKLY_LIMIT_UNITS = 56;
export const MONTHLY_LIMIT_UNITS = 240;

export function usageUnits(row: SummaryDailyUsageRow): number {
  // Advanced generations cost two units to reflect the heavier model usage.
  return row.standard_uses + row.advanced_uses * 2;
}

export function remainingUnits(row: SummaryDailyUsageRow): number {
  return Math.max(0, DAILY_LIMIT_UNITS - usageUnits(row));
}

type ServerClient = SupabaseClient<any>;

export async function ensureDailyUsage(
  client: ServerClient,
  userId: string,
  date: string,
): Promise<SummaryDailyUsageRow> {
  const { data, error } = await client
    .from("summary_usage_daily")
    .select("id,user_id,date,standard_uses,advanced_uses,total_tokens")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data) {
    return data as SummaryDailyUsageRow;
  }

  const { data: inserted, error: insertErr } = await client
    .from("summary_usage_daily")
    .insert({
      user_id: userId,
      date,
      standard_uses: 0,
      advanced_uses: 0,
      total_tokens: 0,
    })
    .select("id,user_id,date,standard_uses,advanced_uses,total_tokens")
    .single();

  if (insertErr || !inserted) {
    throw new Error(insertErr?.message || "Failed to seed daily usage");
  }

  return inserted as SummaryDailyUsageRow;
}

export async function updateDailyUsage(
  client: ServerClient,
  row: SummaryDailyUsageRow,
  mode: SummaryMode,
  tokens: number,
): Promise<SummaryDailyUsageRow> {
  const payload = {
    standard_uses: row.standard_uses + (mode === "standard" ? 1 : 0),
    advanced_uses: row.advanced_uses + (mode === "advanced" ? 1 : 0),
    total_tokens: row.total_tokens + Math.max(0, tokens),
  };

  const { data, error } = await client
    .from("summary_usage_daily")
    .update(payload)
    .eq("id", row.id)
    .select("id,user_id,date,standard_uses,advanced_uses,total_tokens")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to update daily usage");
  }

  return data as SummaryDailyUsageRow;
}

export async function ensureMinuteUsage(
  client: ServerClient,
  model: string,
  minuteStartIso: string,
): Promise<SummaryMinuteUsageRow> {
  try {
    const { data, error } = await client
      .from("summary_usage_minute")
      .select("id,model,minute_start,tokens_used")
      .eq("model", model)
      .eq("minute_start", minuteStartIso)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return data as SummaryMinuteUsageRow;
    }

    const { data: inserted, error: insertErr } = await client
      .from("summary_usage_minute")
      .insert({
        model,
        minute_start: minuteStartIso,
        tokens_used: 0,
      })
      .select("id,model,minute_start,tokens_used")
      .single();

    if (insertErr || !inserted) {
      throw insertErr ?? new Error("Failed to seed minute usage");
    }

    return inserted as SummaryMinuteUsageRow;
  } catch (error: unknown) {
    if (!isMissingMinuteTable(error)) {
      // Do not block generation if minute tracking fails for other reasons (e.g., RLS/DDL).
      console.error("Skipping minute usage tracking", error);
    }
    return {
      id: -1,
      model,
      minute_start: minuteStartIso,
      tokens_used: 0,
    };
  }
}

export async function bumpMinuteUsage(
  client: ServerClient,
  row: SummaryMinuteUsageRow,
  tokens: number,
): Promise<void> {
  if (row.id < 0) return;
  const { error } = await client
    .from("summary_usage_minute")
    .update({ tokens_used: row.tokens_used + Math.max(0, tokens) })
    .eq("id", row.id);

  if (error && !isMissingMinuteTable(error)) {
    throw new Error(error.message);
  }
}

function isMissingMinuteTable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : "";
  return message.includes("summary_usage_minute");
}
