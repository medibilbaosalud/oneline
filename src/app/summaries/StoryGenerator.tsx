// src/app/summaries/StoryGenerator.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVault } from "@/hooks/useVault";
import { decryptText } from "@/lib/crypto";
import type { SummaryLanguage, SummaryPreferences } from "@/lib/summaryPreferences";

const WEEKLY_GUARD_MESSAGE = "Write at least four days to unlock your first weekly story.";

type Length = "short" | "medium" | "long";
type Tone = "auto" | "warm" | "neutral" | "poetic" | "direct";
type Pov = "auto" | "first" | "third";
type Preset = "30" | "90" | "180" | "year" | "lastWeek" | "custom";

type StoryGeneratorProps = {
  initialOptions?: SummaryPreferences;
  initialPreset?: Preset;
  initialRange?: { from: string; to: string } | null;
};

function escapeHtml(raw: string) {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatStoryBlocks(story: string) {
  return story
    .trim()
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const escaped = escapeHtml(block);
      return escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br />");
    });
}

function ymd(d: Date) {
  const iso = new Date(d).toISOString();
  return iso.slice(0, 10);
}

function startOfYear(d = new Date()) {
  return new Date(d.getFullYear(), 0, 1);
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function lastWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const end = new Date(now);
  end.setDate(now.getDate() - (day === 0 ? 7 : day));
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  return { from: ymd(start), to: ymd(end) };
}

type Quota = {
  limit: number;
  used: number;
  remaining: number;
  resetAt: string;
  period: {
    start: string;
    end: string;
  };
};

type EntryPayload = {
  id: string;
  created_at: string;
  day?: string | null;
  content_cipher?: string | null;
  iv?: string | null;
  content?: string | null;
};

export default function StoryGenerator({
  initialOptions,
  initialPreset,
  initialRange,
}: StoryGeneratorProps) {
  const { dataKey, unlockWithPassphrase, getCurrentKey } = useVault();
  // Preset + from/to
  const today = useMemo(() => new Date(), []);
  const [preset, setPreset] = useState<Preset>(initialPreset ?? (initialRange ? "custom" : "lastWeek"));
  const [customFrom, setCustomFrom] = useState<string>(initialRange?.from ?? ymd(addDays(today, -30)));
  const [customTo, setCustomTo] = useState<string>(initialRange?.to ?? ymd(today));

  // Options
  const [length, setLength] = useState<Length>(initialOptions?.length ?? "medium");
  const [tone, setTone] = useState<Tone>(initialOptions?.tone ?? "auto");
  const [pov, setPov] = useState<Pov>(initialOptions?.pov ?? "auto");
  const includeHighlights = true;
  const [notes, setNotes] = useState(initialOptions?.notes ?? "");
  const [language, setLanguage] = useState<SummaryLanguage>(initialOptions?.language ?? "en");

  // Result
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [story, setStory] = useState<string>("");
  const formattedStory = useMemo(() => (story ? formatStoryBlocks(story) : []), [story]);
  const [loadingPhrase, setLoadingPhrase] = useState<string | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [quotaError, setQuotaError] = useState<string | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(true);
  const [showConsent, setShowConsent] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalPassphrase, setModalPassphrase] = useState("");
  const [modalBusy, setModalBusy] = useState(false);
  const [allowShortRangeOverride, setAllowShortRangeOverride] = useState(false);

  const lengthGuidance: Record<Length, string> = {
    short: "~200–300 words",
    medium: "~600–800 words",
    long: "~1200+ words",
  };

  const loadingPhrases = [
    "Weaving your week together…",
    "Threading highlights without changing your words…",
    "Letting your tone lead the story…",
    "Balancing bright spots and low points…",
    "Keeping languages exactly as you wrote them…",
  ];

  // Resolve the date range according to the preset
  const { from, to } = useMemo(() => {
    if (preset === "custom") {
      return { from: customFrom, to: customTo };
    }
    if (preset === "lastWeek") {
      return lastWeekRange();
    }
    const now = new Date();
    if (preset === "year") {
      return { from: ymd(startOfYear(now)), to: ymd(now) };
    }
    if (preset === "30") {
      return { from: ymd(addDays(now, -30)), to: ymd(now) };
    }
    if (preset === "90") {
      return { from: ymd(addDays(now, -90)), to: ymd(now) };
    }
    // 180
    return { from: ymd(addDays(now, -180)), to: ymd(now) };
  }, [preset, customFrom, customTo]);

  useEffect(() => {
    setAllowShortRangeOverride(false);
  }, [from, to]);

  const propsSignature = useRef<string | null>(null);

  useEffect(() => {
    const signature = JSON.stringify({
      options: initialOptions ?? null,
      preset: initialPreset ?? null,
      range: initialRange ?? null,
    });

    if (propsSignature.current === signature) {
      return;
    }

    propsSignature.current = signature;

    if (initialOptions) {
      setLength(initialOptions.length);
      setTone(initialOptions.tone);
      setPov(initialOptions.pov);
      // Highlights are always on now; keep the saved preference for payload completeness.
      setNotes(initialOptions.notes ?? "");
      setLanguage(initialOptions.language ?? "en");
    } else {
      setLength("medium");
      setTone("auto");
      setPov("auto");
      setNotes("");
      setLanguage("en");
    }

    if (initialRange) {
      setCustomFrom(initialRange.from);
      setCustomTo(initialRange.to);
      setPreset(initialPreset ?? "custom");
    } else if (initialPreset) {
      setPreset(initialPreset);
    }
  }, [initialOptions, initialPreset, initialRange]);

  const refreshQuota = useCallback(async () => {
    try {
      setQuotaLoading(true);
      setQuotaError(null);
      const res = await fetch("/api/summaries/quota", { cache: "no-store" });
      if (res.status === 401) {
        setQuota(null);
        setQuotaError("Sign in to see your monthly allowance.");
        return;
      }
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? res.statusText);
      }
      const json = (await res.json()) as Quota;
      setQuota(json);
    } catch (err) {
      setQuotaError(err instanceof Error ? err.message : "Unable to load allowance");
    } finally {
      setQuotaLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshQuota();
  }, [refreshQuota]);

  useEffect(() => {
    if (!loading) {
      setLoadingPhrase(null);
      return;
    }

    let index = Math.floor(Math.random() * loadingPhrases.length);
    setLoadingPhrase(loadingPhrases[index]);

    const timer = setInterval(() => {
      index = (index + 1) % loadingPhrases.length;
      setLoadingPhrase(loadingPhrases[index]);
    }, 2200);

    return () => clearInterval(timer);
  }, [loading, loadingPhrases]);

  function openConsent() {
    setModalError(null);
    setModalPassphrase("");
    setConsentChecked(false);
    setShowConsent(true);
  }

  async function performGeneration(key: CryptoKey) {
    try {
      setLoading(true);
      setError(null);
      setStory("");
      setLoadingPhrase(loadingPhrases[Math.floor(Math.random() * loadingPhrases.length)]);

      const params = new URLSearchParams({ from, to });
      const historyRes = await fetch(`/api/history?${params.toString()}`, { cache: "no-store" });
      if (historyRes.status === 401) {
        throw new Error("Please sign in to access your history.");
      }
      const historyJson = (await historyRes.json().catch(() => ({}))) as {
        entries?: EntryPayload[];
        error?: string;
      };
      if (historyJson.error) {
        throw new Error(historyJson.error);
      }
      const entries = historyJson.entries ?? [];
      if (entries.length === 0) {
        throw new Error("No entries available in that range.");
      }

      const decrypted: { content: string; created_at: string; day?: string | null }[] = [];
      for (const entry of entries) {
        if (entry.content_cipher && entry.iv) {
          try {
            const text = await decryptText(key, entry.content_cipher, entry.iv);
            if (text.trim()) {
              decrypted.push({ content: text, created_at: entry.created_at, day: entry.day });
            }
          } catch {
            throw new Error("Unable to decrypt some entries. Unlock with the correct passphrase.");
          }
        } else if (entry.content) {
          decrypted.push({ content: entry.content, created_at: entry.created_at, day: entry.day });
        }
      }

      if (decrypted.length === 0) {
        throw new Error("No decryptable entries in that range.");
      }

      const fromDate = new Date(`${from}T00:00:00Z`);
      const toDate = new Date(`${to}T00:00:00Z`);
      const diffDays = Math.max(1, Math.round((toDate.valueOf() - fromDate.valueOf()) / (1000 * 60 * 60 * 24)) + 1);
      if (diffDays <= 8 && decrypted.length < 4 && !allowShortRangeOverride) {
        throw new Error(WEEKLY_GUARD_MESSAGE);
      }

      const payload = {
        consent: true,
        from,
        to,
        options: {
          length,
          tone,
          pov,
          includeHighlights,
          notes: notes.trim() || undefined,
          language,
        },
        entries: decrypted,
      };

      const res = await fetch("/api/generate-story", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json().catch(() => null)) as { story?: string; error?: string } | null;
      if (!res.ok) {
        throw new Error(json?.error || res.statusText || "Failed to generate story");
      }

      setStory(json?.story || "");
      refreshQuota();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setLoading(false);
      setModalBusy(false);
    }
  }

  async function confirmConsent() {
    if (!consentChecked) {
      setModalError("Please confirm you consent to sharing your decrypted entries.");
      return;
    }
    setModalBusy(true);
    setModalError(null);

    try {
      let key = dataKey ?? null;
      if (!key) {
        const passphrase = modalPassphrase.trim();
        if (!passphrase) {
          setModalError("Enter your passphrase to unlock the vault.");
          setModalBusy(false);
          return;
        }
        try {
          await unlockWithPassphrase(passphrase);
        } catch (err) {
          setModalError(err instanceof Error ? err.message : "Unable to unlock with that passphrase.");
          setModalBusy(false);
          return;
        }
        key = getCurrentKey();
        if (!key) {
          setModalError("Vault is still locked. Try again.");
          setModalBusy(false);
          return;
        }
      }

      setShowConsent(false);
      await performGeneration(key);
    } finally {
      setModalPassphrase("");
    }
  }

  return (
    <div className="w-full space-y-8 text-zinc-100">
      {/* Controles */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 via-black/60 to-indigo-900/20 p-5 shadow-2xl shadow-indigo-950/40">
        <div className="mb-5 grid gap-3 rounded-2xl border border-white/10 bg-black/40 p-4 sm:grid-cols-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Quota</p>
            {quotaLoading ? (
              <p className="text-sm text-zinc-300">Checking allowance…</p>
            ) : quotaError ? (
              <p className="text-sm text-rose-400">{quotaError}</p>
            ) : quota ? (
              <p className="text-sm text-zinc-100">
                <span className="font-semibold">{quota.remaining}</span> of {quota.limit} stories left
              </p>
            ) : (
              <p className="text-sm text-zinc-300">Sign in to see your allowance.</p>
            )}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: quota ? `${Math.min(100, (quota.used / quota.limit) * 100)}%` : "0%" }}
              />
            </div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">
              {quota ? `Resets ${new Date(quota.resetAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : "Refresh to update"}
            </p>
          </div>
          <div className="space-y-1 rounded-xl border border-white/5 bg-white/5 px-3 py-2">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Voice</p>
            <p className="text-sm text-zinc-100">Keeps your languages, tone, and highlights intact.</p>
            <p className="text-[11px] text-zinc-500">Gemini prompt preserves code-switching automatically.</p>
          </div>
          <div className="space-y-1 rounded-xl border border-white/5 bg-white/5 px-3 py-2">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Privacy</p>
            <p className="text-sm text-zinc-100">Vault stays client-side until you consent to send.</p>
            <p className="text-[11px] text-zinc-500">We never store your passphrase.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Preset */}
          <label className="flex flex-col gap-2">
            <span className="text-sm text-zinc-400">Period</span>
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as Preset)}
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="30">Last 30 days</option>
              <option value="lastWeek">Last week (Mon–Sun)</option>
              <option value="90">Last 3 months</option>
              <option value="180">Last 6 months</option>
              <option value="year">Year to date</option>
              <option value="custom">Custom</option>
            </select>
          </label>

          {/* Custom dates */}
          {preset === "custom" && (
            <>
              <label className="flex flex-col gap-2">
                <span className="text-sm text-zinc-400">From</span>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm text-zinc-400">To</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
            </>
          )}

          {/* Length */}
          <label className="flex flex-col gap-1">
            <span className="text-sm text-zinc-400">Length</span>
            <select
              value={length}
              onChange={(e) => setLength(e.target.value as Length)}
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="long">Long</option>
            </select>
            <span className="text-xs text-zinc-500">{lengthGuidance[length]}</span>
          </label>

          {/* Tone */}
          <label className="flex flex-col gap-2">
            <span className="text-sm text-zinc-400">Tone</span>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as Tone)}
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="auto">Auto</option>
              <option value="warm">Warm</option>
              <option value="neutral">Neutral</option>
              <option value="poetic">Poetic</option>
              <option value="direct">Direct</option>
            </select>
          </label>

          {/* POV */}
          <label className="flex flex-col gap-2">
            <span className="text-sm text-zinc-400">Point of view</span>
            <select
              value={pov}
              onChange={(e) => setPov(e.target.value as Pov)}
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="auto">Auto</option>
              <option value="first">First person</option>
              <option value="third">Third person</option>
            </select>
          </label>

          {/* Highlights */}
          <div className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-white/5 px-3 py-3 text-sm text-zinc-200">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold">Highlights included automatically</span>
            </div>
            <span className="text-xs text-zinc-500">Your story ends with the biggest wins and low points by default.</span>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm text-zinc-400">Notes to the writer (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any nuance you want the story to consider…"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-indigo-500"
            />
          </label>
        </div>

        {/* Action */}
        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={openConsent}
            disabled={loading}
            className="group relative overflow-hidden rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="absolute inset-0 -z-10 bg-gradient-to-r from-indigo-500 via-sky-500 to-purple-500 opacity-0 blur transition duration-500 group-hover:opacity-60" />
            {loading ? "Generating…" : "Generate your story"}
          </button>
          {error && <span className="text-sm text-rose-400">{error}</span>}
          {error === WEEKLY_GUARD_MESSAGE && (
            <button
              type="button"
              className="rounded-lg border border-white/15 px-3 py-1 text-sm font-medium text-indigo-100 transition hover:border-white/30 hover:bg-white/5"
              onClick={() => {
                setAllowShortRangeOverride(true);
                setError(null);
                openConsent();
              }}
            >
              Generate anyway
            </button>
          )}
        </div>
      </div>

      {/* Resultado */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/50 p-5 shadow-2xl shadow-indigo-950/40" aria-busy={loading}>
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5" />
        {loading && (
          <div className="relative space-y-3">
            <div className="flex items-center gap-2 text-sm text-indigo-100">
              <div className="h-2.5 w-2.5 animate-ping rounded-full bg-indigo-400" />
              <span className="font-medium">Crafting your story…</span>
            </div>
            <p className="text-sm text-zinc-400">{loadingPhrase || "Holding your voice steady while we assemble this recap."}</p>
            <div className="space-y-2">
              <div className="h-3 w-full animate-pulse rounded-full bg-white/10" />
              <div className="h-3 w-11/12 animate-pulse rounded-full bg-white/10" />
              <div className="h-3 w-10/12 animate-pulse rounded-full bg-white/10" />
            </div>
          </div>
        )}

        {!loading && story && (
          <article className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 via-indigo-900/20 to-purple-900/10 p-5 shadow-xl shadow-indigo-950/40">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.12),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(236,72,153,0.12),transparent_26%)]" />
            <div className="relative mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-100">
              <span className="h-[2px] w-6 rounded-full bg-indigo-400" />
              <span>Your story</span>
            </div>

            <div className="relative space-y-3 font-serif text-[17px] leading-relaxed text-zinc-50">
              {formattedStory.map((block, idx) => (
                <p
                  key={idx}
                  className="rounded-xl bg-white/5 px-4 py-3 text-[16px] leading-[1.6] shadow-inner shadow-black/10 ring-1 ring-white/5"
                >
                  <span dangerouslySetInnerHTML={{ __html: block }} />
                </p>
              ))}
            </div>
          </article>
        )}

        {!loading && !story && (
          <p className="relative text-zinc-400">Your story will appear here.</p>
        )}
      </div>

      {showConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-950 p-6 text-zinc-100 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">Share decrypted entries with Gemini</h3>
            <p className="mt-2 text-sm text-zinc-400">
              To generate this story we will send your decrypted journal lines to our backend and to Google Gemini. Nothing is stored once the story is produced.
            </p>

            <label className="mt-4 flex items-start gap-3 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-zinc-600 bg-neutral-900 text-indigo-500 focus:ring-2 focus:ring-indigo-500"
              />
              <span>I consent to send my decrypted entries to Gemini for this request.</span>
            </label>

            {!dataKey && (
              <div className="mt-4">
                <label className="flex flex-col gap-2 text-sm text-zinc-300">
                  <span>Passphrase</span>
                  <input
                    type="password"
                    value={modalPassphrase}
                    onChange={(e) => setModalPassphrase(e.target.value)}
                    className="rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40"
                    placeholder="Unlock your vault"
                  />
                </label>
              </div>
            )}

            {modalError && <p className="mt-4 text-sm text-rose-400">{modalError}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowConsent(false);
                  setModalBusy(false);
                  setModalPassphrase("");
                }}
                className="rounded-lg bg-neutral-800 px-4 py-2 text-sm text-zinc-200 hover:bg-neutral-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmConsent}
                disabled={modalBusy}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                {modalBusy ? 'Preparing…' : 'Confirm & generate'}
              </button>
            </div>

            <p className="mt-4 text-xs text-zinc-500">
              SECURITY: This action temporarily exposes your decrypted text to our server and Gemini. We never store your passphrase, and losing it means we cannot recover your data.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}