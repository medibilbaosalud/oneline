// src/app/summaries/page.tsx
// SECURITY: Story generation requires an unlocked vault to decrypt entries client-side.

import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

import VaultGate from "@/components/VaultGate";
import StoryGenerator from "./StoryGenerator";
import {
  DEFAULT_SUMMARY_PREFERENCES,
  coerceSummaryPreferences,
  computeSummaryReminder,
  isSummaryFrequency,
  type SummaryFrequency,
  type SummaryPreferences,
} from "@/lib/summaryPreferences";

type SearchParams = {
  from?: string;
  to?: string;
};

function isIsoDate(value: string | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function humanizePeriod(period: SummaryFrequency) {
  return period.charAt(0).toUpperCase() + period.slice(1);
}

function formatWindow(window?: { start: string; end: string }) {
  if (!window) return "";
  try {
    const formatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });
    const from = new Date(`${window.start}T00:00:00Z`);
    const to = new Date(`${window.end}T00:00:00Z`);
    return `${formatter.format(from)} → ${formatter.format(to)}`;
  } catch {
    return `${window.start} → ${window.end}`;
  }
}

export default async function SummariesPage({ searchParams }: { searchParams?: SearchParams }) {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let frequency: SummaryFrequency = "weekly";
  let storyPreferences: SummaryPreferences = { ...DEFAULT_SUMMARY_PREFERENCES };
  let reminder = computeSummaryReminder(frequency, null);

  if (user) {
    const { data, error } = await supabase
      .from("user_settings")
      .select("frequency, summary_preferences, last_summary_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!error && data) {
      frequency = isSummaryFrequency(data.frequency) ? data.frequency : "weekly";
      storyPreferences = data.summary_preferences
        ? coerceSummaryPreferences(data.summary_preferences)
        : { ...DEFAULT_SUMMARY_PREFERENCES };
      reminder = computeSummaryReminder(frequency, data.last_summary_at ?? null);
    }
  }

  const fromParam = searchParams?.from;
  const toParam = searchParams?.to;
  const hasCustomRange = isIsoDate(fromParam) && isIsoDate(toParam);
  const initialRange = hasCustomRange
    ? { from: fromParam!, to: toParam! }
    : reminder.due
    ? reminder.window
    : undefined;

  const initialPreset = initialRange ? "custom" : undefined;

  return (
    <main className="min-h-screen bg-black">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-3xl font-semibold text-zinc-100">Summaries</h1>
        <p className="mt-1 text-zinc-400">Generate a story from your journal.</p>

        {reminder.due && (
          <div className="mt-6 rounded-2xl border border-indigo-500/40 bg-indigo-500/10 p-4 text-sm text-indigo-100">
            <p className="text-sm font-semibold text-white">
              {humanizePeriod(reminder.period)} recap ready to generate
            </p>
            <p className="mt-1 text-xs text-indigo-100/80">
              Suggested range: {formatWindow(reminder.window)}. We’ll load these defaults for you below.
            </p>
          </div>
        )}

        <div className="mt-8">
          <VaultGate>
            <StoryGenerator
              initialOptions={storyPreferences}
              initialPreset={initialPreset}
              initialRange={initialRange}
            />
          </VaultGate>
        </div>
      </div>
    </main>
  );
}

// SECURITY WARNING: Without unlocking the vault, no plaintext is ever sent to the server for summaries.
