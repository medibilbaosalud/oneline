// src/app/summaries/StoryGenerator.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVault } from "@/hooks/useVault";
import { decryptText } from "@/lib/crypto";
import type { SummaryPreferences } from "@/lib/summaryPreferences";

type Length = "short" | "medium" | "long";
type Tone = "auto" | "warm" | "neutral" | "poetic" | "direct";
type Pov = "auto" | "first" | "third";
type Preset = "30" | "90" | "180" | "year" | "custom";

type StoryGeneratorProps = {
  initialOptions?: SummaryPreferences;
  initialPreset?: Preset;
  initialRange?: { from: string; to: string } | null;
};

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
  const [preset, setPreset] = useState<Preset>(initialPreset ?? (initialRange ? "custom" : "90"));
  const [customFrom, setCustomFrom] = useState<string>(initialRange?.from ?? ymd(addDays(today, -30)));
  const [customTo, setCustomTo] = useState<string>(initialRange?.to ?? ymd(today));

  // Options
  const [length, setLength] = useState<Length>(initialOptions?.length ?? "medium");
  const [tone, setTone] = useState<Tone>(initialOptions?.tone ?? "auto");
  const [pov, setPov] = useState<Pov>(initialOptions?.pov ?? "auto");
  const [includeHighlights, setIncludeHighlights] = useState(
    initialOptions?.includeHighlights ?? true,
  );
  const [notes, setNotes] = useState(initialOptions?.notes ?? "");

  // Result
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [story, setStory] = useState<string>("");
  const [quota, setQuota] = useState<Quota | null>(null);
  const [quotaError, setQuotaError] = useState<string | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(true);
  const [showConsent, setShowConsent] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalPassphrase, setModalPassphrase] = useState("");
  const [modalBusy, setModalBusy] = useState(false);

  // Resolve the date range according to the preset
  const { from, to } = useMemo(() => {
    if (preset === "custom") {
      return { from: customFrom, to: customTo };
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
      setIncludeHighlights(initialOptions.includeHighlights);
      setNotes(initialOptions.notes ?? "");
    } else {
      setLength("medium");
      setTone("auto");
      setPov("auto");
      setIncludeHighlights(true);
      setNotes("");
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
    <div className="w-full space-y-6 text-zinc-100">
      {/* Controles */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 rounded-xl border border-white/5 bg-black/40 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium text-zinc-200">Monthly summaries</p>
            {quota && (
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Resets {new Date(quota.resetAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              {quotaLoading ? (
                <p className="text-sm text-zinc-400">Checking allowance…</p>
              ) : quotaError ? (
                <p className="text-sm text-rose-400">{quotaError}</p>
              ) : quota ? (
                <p className="text-sm text-zinc-300">
                  {quota.remaining} of {quota.limit} stories left this month
                </p>
              ) : (
                <p className="text-sm text-zinc-400">Sign in to see your allowance.</p>
              )}
            </div>
            {quota && (
              <div className="text-right text-xs text-zinc-500">
                <span className="font-medium text-zinc-200">{quota.used}</span> generated so far
              </div>
            )}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: quota ? `${Math.min(100, (quota.used / quota.limit) * 100)}%` : "0%" }}
            />
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
          <label className="flex flex-col gap-2">
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
          <label className="flex items-center gap-3 pt-6">
            <input
              type="checkbox"
              checked={includeHighlights}
              onChange={(e) => setIncludeHighlights(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-sm text-zinc-300">Include highlights</span>
          </label>
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
            className="rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Generating…" : "Generate your story"}
          </button>
          {error && <span className="text-sm text-rose-400">{error}</span>}
        </div>
      </div>

      {/* Resultado */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 shadow-sm">
        {story ? (
          <article className="prose prose-invert max-w-none">
            {/* Simple rendering; pipe through a markdown parser if desired */}
            <pre className="whitespace-pre-wrap break-words text-zinc-100">{story}</pre>
          </article>
        ) : (
          <p className="text-zinc-400">Your story will appear here.</p>
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
                  setModalPassphrase('');
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