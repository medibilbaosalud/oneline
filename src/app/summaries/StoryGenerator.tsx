// src/app/summaries/StoryGenerator.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Length = "short" | "medium" | "long";
type Tone = "auto" | "warm" | "neutral" | "poetic" | "direct";
type Pov = "auto" | "first" | "third";
type Preset = "30" | "90" | "180" | "year" | "custom";

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

export default function StoryGenerator() {
  // Preset + from/to
  const [preset, setPreset] = useState<Preset>("90");
  const today = useMemo(() => new Date(), []);
  const [customFrom, setCustomFrom] = useState<string>(ymd(addDays(today, -30)));
  const [customTo, setCustomTo] = useState<string>(ymd(today));

  // Options
  const [length, setLength] = useState<Length>("medium");
  const [tone, setTone] = useState<Tone>("auto");
  const [pov, setPov] = useState<Pov>("auto");
  const [includeHighlights, setIncludeHighlights] = useState(true);
  const [notes, setNotes] = useState("");

  // Result
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [story, setStory] = useState<string>("");
  const [quota, setQuota] = useState<Quota | null>(null);
  const [quotaError, setQuotaError] = useState<string | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(true);

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

  async function handleGenerate() {
    try {
      setLoading(true);
      setError(null);
      setStory("");

      const params = new URLSearchParams({
        from,
        to,
        length,
        tone,
        pov,
        highlights: String(includeHighlights),
      });
      if (notes.trim()) params.set("notes", notes.trim());

      const res = await fetch(`/api/year-story?${params.toString()}`, {
        method: "GET",
      });

      let json: { story?: string; error?: string } | null = null;
      const isJson = res.headers.get("content-type")?.includes("application/json");
      if (isJson) {
        json = (await res.json()) as { story?: string; error?: string };
      } else {
      // Fallback in case the server responds with plain text
        const txt = await res.text();
        try {
          json = JSON.parse(txt) as { story?: string; error?: string };
        } catch {
          json = { error: txt || "Unexpected response" };
        }
      }

      if (!res.ok) {
        throw new Error(json?.error || res.statusText || "Failed");
      }
      setStory(json?.story || "");
      refreshQuota();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setLoading(false);
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
            onClick={handleGenerate}
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
    </div>
  );
}