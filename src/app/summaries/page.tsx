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
    <main className="min-h-screen bg-neutral-950">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-10 h-96 w-96 rounded-full bg-purple-500/20 blur-[150px]" />
        <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-indigo-500/15 blur-[130px]" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 py-10">
        {/* Hero Section */}
        <header className="mb-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 blur-xl opacity-50" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-3xl shadow-lg">
                ✨
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-purple-400">AI Stories</p>
              <h1 className="text-4xl font-bold text-white">Summaries</h1>
            </div>
          </div>
          <p className="text-lg text-neutral-300 max-w-2xl">
            Transform your journal entries into personalized narratives. Your stories, your voice, your memories.
          </p>
        </header>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🎭</span>
              <h3 className="font-semibold text-white">Your Voice</h3>
            </div>
            <p className="text-sm text-neutral-400">AI writes in your tone and style, preserving your unique perspective.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🔐</span>
              <h3 className="font-semibold text-white">Private</h3>
            </div>
            <p className="text-sm text-neutral-400">Entries decrypt locally. We never see your plaintext.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🌍</span>
              <h3 className="font-semibold text-white">Multilingual</h3>
            </div>
            <p className="text-sm text-neutral-400">Write in any language. Your story respects your words.</p>
          </div>
        </div>

        {/* Status Card */}
        <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-500/10 via-transparent to-indigo-500/10 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-purple-300">Cadence</p>
                <p className="text-2xl font-bold text-white">{humanizePeriod(reminder.period)}</p>
              </div>
              <div className="h-10 w-px bg-white/10" />
              <div>
                <p className="text-xs uppercase tracking-wider text-purple-300">Suggested Range</p>
                <p className="text-lg font-semibold text-white">{formatWindow(reminder.window) || "Select below"}</p>
              </div>
            </div>
            {reminder.due && (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-300">
                ✓ Ready to generate
              </span>
            )}
          </div>
        </div>

        {/* Banners */}
        {reminder.minimumMet === false && (
          <div className="mb-6 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-transparent p-5">
            <div className="flex items-start gap-4">
              <span className="text-3xl">📝</span>
              <div>
                <p className="font-semibold text-amber-200">Keep writing!</p>
                <p className="text-sm text-amber-100/70 mt-1">
                  Add at least {minimumRequired} days in the last week to unlock your story.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-2 flex-1 rounded-full bg-amber-900/50 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (entryCount / minimumRequired) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-amber-200">{entryCount}/{minimumRequired} {entryLabel}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Story Generator */}
        <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-6">
          <VaultGate>
            <StoryGenerator
              initialOptions={storyPreferences}
              initialPreset={initialPreset}
              initialRange={initialRange}
            />
          </VaultGate>
        </div>

        {/* Feedback - Collapsible */}
        <details className="group mt-10">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-white/10 bg-neutral-900/60 px-5 py-4 transition hover:bg-neutral-900 [&::-webkit-details-marker]:hidden">
            <div className="flex items-center gap-3">
              <span className="text-xl">💬</span>
              <div>
                <p className="font-medium text-white">Send feedback</p>
                <p className="text-xs text-neutral-400">Found a bug or have a suggestion?</p>
              </div>
            </div>
            <svg className="h-5 w-5 text-neutral-400 transition group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="mt-3" id="feedback">
            <FeedbackForm defaultPage="/summaries" className="border-white/10 bg-neutral-900/40" />
          </div>
        </details>
      </div>
    </main>
  );
}

// SECURITY WARNING: Without unlocking the vault, no plaintext is ever sent to the server for summaries.
