"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GUIDANCE_NOTES_LIMIT_BASE,
  GUIDANCE_NOTES_LIMIT_EXTENDED,
  entryLimitFor,
  guidanceLimitFor,
} from "@/lib/summaryPreferences";
import type { SummaryLanguage, SummaryPreferences } from "@/lib/summaryPreferences";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { primeEntryLimitsCache } from "@/hooks/useEntryLimits";

type Frequency = "weekly" | "monthly" | "yearly";
type StoryLength = "short" | "medium" | "long";
type StoryTone = "auto" | "warm" | "neutral" | "poetic" | "direct";
type StoryPov = "auto" | "first" | "third";

type SummaryReminder = {
  due: boolean;
  period: Frequency;
  window: { start: string; end: string };
  dueSince: string | null;
  lastSummaryAt: string | null;
};

const LANGUAGE_OPTIONS: Array<{
  value: SummaryLanguage;
  label: string;
  native: string;
  description: string;
}> = [
  {
    value: "es",
    label: "Spanish",
    native: "Español",
    description: "Ideal when you journal or read primarily in Spanish.",
  },
  {
    value: "de",
    label: "German",
    native: "Deutsch",
    description: "Surface the interface in German with matching prompts.",
  },
  {
    value: "fr",
    label: "French",
    native: "Français",
    description: "Keep every control and email in elegant French copy.",
  },
];

type SettingsResponse = {
  ok: boolean;
  error?: string;
  settings?: {
    frequency: Frequency;
    storyPreferences: SummaryPreferences;
    lastSummaryAt: string | null;
    reminder?: SummaryReminder;
  };
};

function clampGuidanceNotes(value: string | null, limit: number) {
  if (!value) return "";
  return value.length > limit ? value.slice(0, limit) : value;
}

function messageFromError(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

function humanizeFrequency(freq: Frequency) {
  return freq.charAt(0).toUpperCase() + freq.slice(1);
}

function formatDateLabel(iso: string | null) {
  if (!iso) return "never";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function formatWindow(window?: { start: string; end: string }) {
  if (!window) return "";
  try {
    const fmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });
    const start = new Date(`${window.start}T00:00:00Z`);
    const end = new Date(`${window.end}T00:00:00Z`);
    return `${fmt.format(start)} → ${fmt.format(end)}`;
  } catch {
    return `${window.start} → ${window.end}`;
  }
}

export default function SettingsClient() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const router = useRouter();
  const [frequency, setFrequency] = useState<Frequency>("weekly");
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [lastSignIn, setLastSignIn] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [storyLength, setStoryLength] = useState<StoryLength>("medium");
  const [storyTone, setStoryTone] = useState<StoryTone>("auto");
  const [storyPov, setStoryPov] = useState<StoryPov>("auto");
  const [storyIncludeHighlights, setStoryIncludeHighlights] = useState(true);
  const [storyNotes, setStoryNotes] = useState("");
  const [extendedGuidance, setExtendedGuidance] = useState(false);
  const [storyLanguage, setStoryLanguage] = useState<SummaryLanguage>("es");
  const [reminder, setReminder] = useState<SummaryReminder | null>(null);

  const guidanceLimit = extendedGuidance ? GUIDANCE_NOTES_LIMIT_EXTENDED : GUIDANCE_NOTES_LIMIT_BASE;

  const extendedToggleClassName = extendedGuidance
    ? "relative inline-flex h-10 w-16 items-center justify-start rounded-full border border-indigo-400/60 bg-indigo-500/20 px-1 transition-colors duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-indigo-400/60 disabled:cursor-not-allowed disabled:opacity-60"
    : "relative inline-flex h-10 w-16 items-center justify-start rounded-full border border-white/15 bg-white/5 px-1 transition-colors duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-indigo-400/60 disabled:cursor-not-allowed disabled:opacity-60";

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const sessionRes = await supabase.auth.getSession();
        if (cancelled) return;

        const session = sessionRes.data.session;
        setEmail(session?.user?.email ?? null);
        setLastSignIn(session?.user?.last_sign_in_at ?? null);
        const bearer = session?.access_token ?? null;
        setAccessToken(bearer ?? null);

        const headers: Record<string, string> = {};
        if (bearer) {
          headers["Authorization"] = `Bearer ${bearer}`;
        }

        const settingsRes = await fetch("/api/settings", {
          cache: "no-store",
          credentials: "include",
          headers,
        });

        if (cancelled) return;

        if (settingsRes.ok) {
          const json = (await settingsRes.json()) as SettingsResponse;
          if (json.ok && json.settings) {
            setFrequency(json.settings.frequency ?? "weekly");
            const prefs = json.settings.storyPreferences;
            if (prefs) {
              setStoryLength(prefs.length);
              setStoryTone(prefs.tone);
              setStoryPov(prefs.pov);
              setStoryIncludeHighlights(prefs.includeHighlights);
              const nextExtended = !!prefs.extendedGuidance;
              setExtendedGuidance(nextExtended);
              setStoryNotes(
                clampGuidanceNotes(prefs.notes ?? "", guidanceLimitFor(nextExtended)),
              );
              setStoryLanguage(prefs.language);
              primeEntryLimitsCache({
                entryLimit: entryLimitFor(nextExtended),
                guidanceLimit: guidanceLimitFor(nextExtended),
                extendedGuidance: nextExtended,
              });
            }
            setReminder(json.settings.reminder ?? null);
          }
        } else if (settingsRes.status === 401) {
          setError("You need to sign in to manage your settings.");
        } else {
          const json = await settingsRes.json().catch(() => null);
          setError(json?.error || "Unable to load your settings right now.");
        }
      } catch (err: unknown) {
        if (!cancelled) setError(messageFromError(err, "Unable to load your settings right now."));
      } finally {
        if (!cancelled) setSettingsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function handleSaveSettings({
    nextFrequency,
    preferenceOverrides,
    suppressFeedback = false,
  }: {
    nextFrequency?: Frequency;
    preferenceOverrides?: Partial<SummaryPreferences>;
    suppressFeedback?: boolean;
  } = {}): Promise<boolean> {
    setSaving(true);
    setFeedback(null);
    setError(null);

    const overrides = preferenceOverrides ?? {};
    const targetFrequency = nextFrequency ?? frequency;
    const nextExtended = overrides.extendedGuidance ?? extendedGuidance;
    const limit = guidanceLimitFor(nextExtended);
    const rawNotesSource =
      overrides.notes !== undefined
        ? overrides.notes ?? ""
        : storyNotes;
    const trimmedNotes = typeof rawNotesSource === "string" ? rawNotesSource.trim() : "";
    const limitedNotes = trimmedNotes.length > limit ? trimmedNotes.slice(0, limit) : trimmedNotes;
    const nextLanguage = overrides.language ?? storyLanguage;

    try {
      const sessionRes = await supabase.auth.getSession();
      const bearer = sessionRes.data.session?.access_token ?? accessToken;
      if (bearer !== accessToken) {
        setAccessToken(bearer ?? null);
      }

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (bearer) {
        headers["Authorization"] = `Bearer ${bearer}`;
      }

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers,
        credentials: "include",
        body: JSON.stringify({
          frequency: targetFrequency,
          storyPreferences: {
            length: overrides.length ?? storyLength,
            tone: overrides.tone ?? storyTone,
            pov: overrides.pov ?? storyPov,
            includeHighlights: overrides.includeHighlights ?? storyIncludeHighlights,
            extendedGuidance: nextExtended,
            notes: limitedNotes.length ? limitedNotes : undefined,
            language: nextLanguage,
          },
        }),
      });

      const json = (await res.json().catch(() => null)) as SettingsResponse | null;
      if (!res.ok || !json?.ok || !json.settings) {
        throw new Error(json?.error || "Could not update your preferences.");
      }

      setFrequency(json.settings.frequency);
      const prefs = json.settings.storyPreferences;
      setStoryLength(prefs.length);
      setStoryTone(prefs.tone);
      setStoryPov(prefs.pov);
      setStoryIncludeHighlights(prefs.includeHighlights);
      const nextExtendedFromResponse = !!prefs.extendedGuidance;
      setExtendedGuidance(nextExtendedFromResponse);
      setStoryNotes(
        clampGuidanceNotes(prefs.notes ?? "", guidanceLimitFor(nextExtendedFromResponse)),
      );
      setStoryLanguage(prefs.language);
      setReminder(json.settings.reminder ?? null);
      if (!suppressFeedback) {
        setFeedback("Saved.");
      }
      primeEntryLimitsCache({
        entryLimit: entryLimitFor(nextExtendedFromResponse),
        guidanceLimit: guidanceLimitFor(nextExtendedFromResponse),
        extendedGuidance: nextExtendedFromResponse,
      });
      return true;
    } catch (err: unknown) {
      setError(messageFromError(err, "Could not update your preferences."));
      return false;
    } finally {
      setSaving(false);
    }
  }

  const handleToggleExtendedGuidance = async () => {
    if (settingsLoading || saving) return;
    const previousExtended = extendedGuidance;
    const previousNotes = storyNotes;
    const next = !extendedGuidance;
    const limit = guidanceLimitFor(next);
    const trimmedNotes = clampGuidanceNotes(previousNotes, limit);

    setExtendedGuidance(next);
    setStoryNotes(trimmedNotes);

    const success = await handleSaveSettings({
      preferenceOverrides: {
        extendedGuidance: next,
        notes: trimmedNotes,
      },
      suppressFeedback: true,
    });

    if (!success) {
      setExtendedGuidance(previousExtended);
      setStoryNotes(previousNotes);
      primeEntryLimitsCache({
        entryLimit: entryLimitFor(previousExtended),
        guidanceLimit: guidanceLimitFor(previousExtended),
        extendedGuidance: previousExtended,
      });
      return;
    }
  };

  const handleSelectLanguage = async (nextLanguage: SummaryLanguage) => {
    if (nextLanguage === storyLanguage) return;
    const previous = storyLanguage;
    setStoryLanguage(nextLanguage);

    if (settingsLoading) {
      return;
    }

    const success = await handleSaveSettings({
      preferenceOverrides: { language: nextLanguage },
      suppressFeedback: true,
    });

    if (success) {
      setFeedback(`Language updated to ${LANGUAGE_OPTIONS.find((option) => option.value === nextLanguage)?.label ?? "your choice"}.`);
    } else {
      setStoryLanguage(previous);
    }
  };

  async function handleExport() {
    setFeedback(null);
    setError(null);
    try {
      const res = await fetch("/api/account/export", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Export failed");
      }

      const blob = new Blob([JSON.stringify(json.entries ?? [], null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "oneline-export.json";
      a.click();
      URL.revokeObjectURL(url);
      setFeedback("Export ready. Check your downloads.");
    } catch (err: unknown) {
      setError(messageFromError(err, "Export failed"));
    }
  }

  async function handleDeleteAccount() {
    setFeedback(null);
    setError(null);
    const confirmation = window.prompt(
      "Type DELETE to confirm that you want to remove your journal entries and sign out.",
    );
    if (confirmation !== "DELETE") return;

    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Delete failed");
      }

      await supabase.auth.signOut();
      router.push("/auth");
      router.refresh();
    } catch (err: unknown) {
      setError(messageFromError(err, "Delete failed"));
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/auth");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <header className="max-w-2xl space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-indigo-300/80">Account</p>
          <h1 className="text-3xl font-semibold md:text-4xl">Settings & safeguards</h1>
          <p className="text-sm text-neutral-400 md:text-base">
            Adjust how often you receive summaries, export your data, and keep your account secure. Everything is private
            by design.
          </p>
        </header>

        <div className="mt-8 space-y-6">
          <section className="rounded-3xl border border-white/10 bg-neutral-900/60 p-6 shadow-lg shadow-black/20">
            <h2 className="text-lg font-semibold text-neutral-100">Profile</h2>
            {settingsLoading ? (
              <p className="mt-3 text-sm text-neutral-400">Loading your account…</p>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                  <p className="text-sm text-neutral-500">Signed in as</p>
                  <p className="truncate text-base font-medium text-neutral-100">{email ?? "Unknown"}</p>
                  {lastSignIn && (
                    <p className="mt-1 text-xs text-neutral-500">Last sign-in: {new Date(lastSignIn).toLocaleString()}</p>
                  )}
                </div>
                <button
                  onClick={handleSignOut}
                  className="self-start rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:bg-white/10"
                >
                  Sign out
                </button>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent p-6 shadow-lg shadow-black/20">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="max-w-xl space-y-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.32em] text-indigo-200/80">
                  Language
                </span>
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-neutral-100">Interface language</h2>
                  <p className="text-sm text-neutral-400">
                    Switch OneLine’s copy to match the language you feel most comfortable reading. We’ll keep the preference synced across devices once you sign in.
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-stretch gap-2 md:min-w-[16rem]">
                {LANGUAGE_OPTIONS.map((option) => {
                  const active = option.value === storyLanguage;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={settingsLoading || saving}
                      onClick={() => {
                        void handleSelectLanguage(option.value);
                      }}
                      className={`group flex w-full flex-col items-start gap-1 rounded-2xl border px-4 py-3 text-left transition-colors duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 disabled:cursor-not-allowed ${
                        active
                          ? "border-indigo-400/70 bg-indigo-500/15 text-neutral-50 shadow-[0_12px_24px_rgba(79,70,229,0.18)]"
                          : "border-white/10 bg-white/5 text-neutral-200 hover:border-indigo-300/60 hover:bg-indigo-500/10"
                      }`}
                    >
                      <span className="text-sm font-semibold">
                        {option.label}
                        <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.2em] text-indigo-200/80">
                          {option.native}
                        </span>
                      </span>
                      <span className="text-xs text-neutral-400 group-hover:text-neutral-300">
                        {option.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="mt-4 text-xs text-neutral-500">
              Change the language anytime — we remember your last choice for every signed-in session.
            </p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-neutral-900/60 p-6 shadow-lg shadow-black/20">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-neutral-100">Summary planner</h2>
                <p className="text-sm text-neutral-400">
                  Choose how often OneLine should compile your recent entries into a recap and how it should sound.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={frequency}
                  disabled={settingsLoading || saving}
                  onChange={(e) => setFrequency(e.target.value as Frequency)}
                  className="rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="weekly">Weekly digest</option>
                  <option value="monthly">Monthly recap</option>
                  <option value="yearly">Yearly report</option>
                </select>
                <button
                  onClick={() => {
                    void handleSaveSettings();
                  }}
                  disabled={settingsLoading || saving}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/5 bg-black/25 p-4">
                <label htmlFor="story-length" className="text-sm font-medium text-neutral-100">
                  Story length
                </label>
                <select
                  id="story-length"
                  value={storyLength}
                  disabled={settingsLoading || saving}
                  onChange={(event) => setStoryLength(event.target.value as StoryLength)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="short">Short (around 4 paragraphs)</option>
                  <option value="medium">Medium (balanced)</option>
                  <option value="long">Long (10+ paragraphs)</option>
                </select>
                <p className="mt-2 text-xs text-neutral-500">
                  We’ll pre-fill the generator with this depth every time you create a story.
                </p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-black/25 p-4">
                <label htmlFor="story-tone" className="text-sm font-medium text-neutral-100">
                  Tone
                </label>
                <select
                  id="story-tone"
                  value={storyTone}
                  disabled={settingsLoading || saving}
                  onChange={(event) => setStoryTone(event.target.value as StoryTone)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="auto">Auto (let the model decide)</option>
                  <option value="warm">Warm & encouraging</option>
                  <option value="neutral">Neutral & factual</option>
                  <option value="poetic">Poetic</option>
                  <option value="direct">Direct & concise</option>
                </select>
                <p className="mt-2 text-xs text-neutral-500">
                  Choose the emotional flavour you want in your summaries.
                </p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-black/25 p-4">
                <label htmlFor="story-pov" className="text-sm font-medium text-neutral-100">
                  Point of view
                </label>
                <select
                  id="story-pov"
                  value={storyPov}
                  disabled={settingsLoading || saving}
                  onChange={(event) => setStoryPov(event.target.value as StoryPov)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="auto">Auto</option>
                  <option value="first">First person</option>
                  <option value="third">Third person</option>
                </select>
                <p className="mt-2 text-xs text-neutral-500">
                  Decide whether the recap should sound like you or like a narrator.
                </p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-black/25 p-4">
                <span className="text-sm font-medium text-neutral-100">Highlights</span>
                <p className="mt-2 text-xs text-neutral-500">
                  Include pinned entries and milestones automatically when building your story.
                </p>
                <label className="mt-3 inline-flex items-center gap-2 text-sm text-neutral-200">
                  <input
                    type="checkbox"
                    checked={storyIncludeHighlights}
                    disabled={settingsLoading || saving}
                    onChange={(event) => setStoryIncludeHighlights(event.target.checked)}
                    className="h-4 w-4 rounded border border-white/20 bg-neutral-900 text-indigo-500 focus:ring-indigo-500 disabled:cursor-not-allowed"
                  />
                  Keep highlights in my summaries
                </label>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/5 bg-black/15 p-4">
              <label htmlFor="story-notes" className="text-sm font-medium text-neutral-100">
                Personal guidance (optional)
              </label>
              <textarea
                id="story-notes"
                value={storyNotes}
                maxLength={guidanceLimit}
                disabled={settingsLoading || saving}
                onChange={(event) => setStoryNotes(event.target.value)}
                placeholder="Anything you want Gemini to emphasize when it writes your recap."
                className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-900 px-3 py-3 text-sm text-neutral-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <div className="mt-1 flex flex-col gap-1 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
                <span>We’ll pre-fill the generator with this note — you can still edit it before sending.</span>
                <span>
                  {storyNotes.length}/{guidanceLimit}
                </span>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] via-white/[0.03] to-transparent p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.28em] text-indigo-200/80">
                    Extended
                  </span>
                  <div>
                    <h3 className="text-xl font-semibold text-neutral-50">Extended guidance mode</h3>
                    <p className="mt-2 max-w-md text-sm text-neutral-400">
                      Double your personal brief limit to 666 characters so you can share richer context with every summary request.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-pressed={extendedGuidance}
                    aria-label="Toggle extended guidance mode"
                    disabled={settingsLoading || saving}
                    onClick={handleToggleExtendedGuidance}
                    className={extendedToggleClassName}
                  >
                    <span className="sr-only">Toggle extended guidance mode</span>
                    <span
                      aria-hidden
                      className={`pointer-events-none h-8 w-8 rounded-full bg-white shadow-[0_8px_16px_rgba(15,23,42,0.25)] transition-transform duration-200 ease-out ${
                        extendedGuidance ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <span className="text-sm font-medium text-neutral-200">
                    {extendedGuidance ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>
              <p className="mt-4 text-xs text-neutral-500">
                Turning this off will gently trim your note back to the standard {GUIDANCE_NOTES_LIMIT_BASE}-character limit.
              </p>
            </div>

            {reminder && (
              <div className="mt-6 rounded-2xl border border-white/5 bg-black/20 p-4 text-xs text-neutral-400">
                <p>
                  Last story captured:
                  <span className="ml-1 text-neutral-200">{formatDateLabel(reminder.lastSummaryAt)}</span>
                </p>
                <p className={`mt-2 ${reminder.due ? "text-amber-300" : "text-neutral-400"}`}>
                  {reminder.due
                    ? `It’s time for your ${reminder.period} story covering ${formatWindow(reminder.window)}. We’ll also remind you on the Today screen.`
                    : `Your ${humanizeFrequency(reminder.period).toLowerCase()} cadence is active. We’ll prompt you again after the current window closes.`}
                </p>
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-neutral-300">
              <p className="font-medium text-neutral-100">New Year automation</p>
              <p className="mt-2 text-neutral-400">
                Every 1 January (Madrid time) we automatically generate a &ldquo;Year in review&rdquo; story for the previous year and
                file it under your summaries. You can always tweak or regenerate it manually from the Year Story tool.
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-neutral-900/60 p-6 shadow-lg shadow-black/20">
            <h2 className="text-lg font-semibold text-neutral-100">Data control</h2>
            <p className="mt-2 text-sm text-neutral-400">
              Download a full copy of your entries or remove everything. Exports are delivered instantly as JSON.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={handleExport}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-neutral-100 transition hover:bg-white/10"
              >
                Export journal (.json)
              </button>
              <button
                onClick={handleDeleteAccount}
                className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20"
              >
                Permanently delete entries
              </button>
            </div>
          </section>

          {(feedback || error) && (
            <div className="rounded-3xl border border-white/10 bg-neutral-900/80 p-4 text-sm">
              {feedback && <p className="text-emerald-400">{feedback}</p>}
              {error && <p className="text-rose-400">{error}</p>}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
