// src/app/summaries/page.tsx
// SECURITY: Story generation requires an unlocked vault to decrypt entries client-side.

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import VaultGate from "@/components/VaultGate";
import StoryGenerator from "./StoryGenerator";
import FeedbackForm from "@/components/FeedbackForm";
import {
  DEFAULT_SUMMARY_PREFERENCES,
  coerceSummaryPreferences,
  computeSummaryReminder,
  isSummaryFrequency,
  withSummaryLength,
  type SummaryFrequency,
  type SummaryPreferences,
} from "@/lib/summaryPreferences";

const TABLE = "user_vaults";
const MIN_WEEKLY_ENTRIES = 4;

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
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?next=/summaries");
  }

  let frequency: SummaryFrequency = "weekly";
  let storyPreferences: SummaryPreferences = { ...DEFAULT_SUMMARY_PREFERENCES };
  let reminder = computeSummaryReminder(frequency, null);

  const { data, error } = await supabase
    .from(TABLE)
    .select("frequency, digest_frequency, story_length, summary_preferences, last_summary_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!error && data) {
    const frequencySource = data.digest_frequency ?? data.frequency;
    frequency = isSummaryFrequency(frequencySource) ? frequencySource : "weekly";
    const basePreferences = data.summary_preferences
      ? coerceSummaryPreferences(data.summary_preferences)
      : { ...DEFAULT_SUMMARY_PREFERENCES };
    storyPreferences = withSummaryLength(
      basePreferences,
      data.story_length ?? basePreferences.length,
    );
    reminder = computeSummaryReminder(frequency, data.last_summary_at ?? null);
  }

  if (reminder.period === "weekly" && reminder.window) {
    const { data: rows, error: journalError } = await supabase
      .from("journal")
      .select("day, created_at")
      .eq("user_id", user.id)
      .gte("day", reminder.window.start)
      .lte("day", reminder.window.end)
      .limit(50);

    if (!journalError && rows) {
      const uniqueDays = new Set<string>();
      for (const row of rows) {
        const day = row.day ?? row.created_at?.slice(0, 10);
        if (day) uniqueDays.add(day);
      }

      const dayCount = uniqueDays.size;
      const minimumMet = dayCount >= MIN_WEEKLY_ENTRIES;
      reminder = {
        ...reminder,
        due: reminder.due && minimumMet,
        entryCount: dayCount,
        minimumRequired: MIN_WEEKLY_ENTRIES,
        minimumMet,
      };
    }
  }

  const fromParam = searchParams?.from;
  const toParam = searchParams?.to;
  const hasCustomRange = isIsoDate(fromParam) && isIsoDate(toParam);
  const initialRange = hasCustomRange
    ? { from: fromParam!, to: toParam! }
    : reminder.due && reminder.window
    ? { from: reminder.window.start, to: reminder.window.end }
    : undefined;

  const initialPreset = initialRange ? "custom" : undefined;

  const minimumRequired = reminder.minimumRequired ?? MIN_WEEKLY_ENTRIES;
  const entryCount = reminder.entryCount ?? 0;
  const daysRemaining = Math.max(0, minimumRequired - entryCount);
  const entryLabel = entryCount === 1 ? "day" : "days";
  const remainingLabel = daysRemaining === 1 ? "day" : "days";

  return (
    <main className="relative min-h-screen overflow-hidden bg-black">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -left-24 top-10 h-64 w-64 rounded-full bg-indigo-500/30 blur-[120px]" />
        <div className="absolute right-0 top-40 h-72 w-72 rounded-full bg-blue-500/20 blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6 py-10">
        <section className="overflow-hidden rounded-3xl border border-white/5 bg-white/5 px-6 py-8 shadow-xl shadow-indigo-950/30">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Encrypted summaries</p>
              <div>
                <h1 className="text-3xl font-semibold text-white sm:text-4xl">Summaries that still sound like you</h1>
                <p className="mt-2 max-w-2xl text-base text-zinc-300">
                  Unlock your vault, pick a window, and get a recap that keeps your tone, languages, and highlights intact.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-zinc-200">
                <span className="rounded-full bg-white/10 px-3 py-1">No credit card. Encrypted by default.</span>
                <span className="rounded-full bg-white/10 px-3 py-1">Works in every language you write.</span>
                <span className="rounded-full bg-white/10 px-3 py-1">Exportable anytime.</span>
              </div>
            </div>
            <div className="flex gap-3 rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-sm text-zinc-200 shadow-inner">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-zinc-400">Status</p>
                <p className="font-semibold text-white">{humanizePeriod(reminder.period)} cadence</p>
                <p className="text-xs text-zinc-400">Ready when you are.</p>
              </div>
              <div className="h-full w-px bg-white/10" />
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-zinc-400">Range</p>
                <p className="font-semibold text-white">{formatWindow(reminder.window) || "Select below"}</p>
                <p className="text-xs text-zinc-400">Adjust with presets or custom dates.</p>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-zinc-200 shadow-inner shadow-black/30">
          <div className="flex flex-col gap-3 items-start justify-between sm:flex-row sm:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Feedback</p>
              <p className="font-semibold text-white">Spotted an issue or have an idea?</p>
              <p className="text-xs text-zinc-300">Every user can send feedback—no login required. It lives at the bottom of this page.</p>
            </div>
            <a
              href="#feedback"
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/10 transition hover:bg-white/20"
            >
              Jump to feedback
              <span aria-hidden>↘</span>
            </a>
          </div>
        </div>

        {reminder.due && (
          <div className="mt-6 rounded-2xl border border-indigo-400/30 bg-indigo-500/10 p-4 text-sm text-indigo-50 shadow-lg shadow-indigo-900/30">
            <p className="text-sm font-semibold text-white">
              {humanizePeriod(reminder.period)} recap ready to generate
            </p>
            <p className="mt-1 text-xs text-indigo-100/80">
              Suggested range: {formatWindow(reminder.window)}. We’ll load these defaults for you below.
            </p>
          </div>
        )}

        {reminder.minimumMet === false && (
          <div className="mt-6 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-50 shadow-lg shadow-amber-900/30">
            <p className="text-sm font-semibold text-white">Write a few more days first</p>
            <p className="mt-1 text-xs text-amber-100/80">
              Add at least {minimumRequired} days in the last week to unlock your next weekly story.
            </p>
            {reminder.entryCount !== undefined && (
              <p className="mt-1 text-xs text-amber-100/80">
                You&apos;re at {entryCount}/{minimumRequired} {entryLabel} — {daysRemaining} more {remainingLabel} to go.
              </p>
            )}
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

        <div className="mt-10">
          <FeedbackForm id="feedback" />
        </div>
      </div>
    </main>
  );
}

// SECURITY WARNING: Without unlocking the vault, no plaintext is ever sent to the server for summaries.
