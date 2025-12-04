"use client";

import { useState } from "react";

const inputCls =
  "w-full mt-1 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500";

export default function YearStoryPage() {
  const previousYear = new Date().getFullYear() - 1;
  const [from, setFrom] = useState(`${previousYear}-01-01`);
  const [to, setTo] = useState(`${previousYear}-12-31`);
  type LengthOption = "short" | "medium" | "long";
  type ToneOption = "auto" | "warm" | "neutral" | "poetic" | "direct";
  type PovOption = "auto" | "first" | "third";

  const [length, setLength] = useState<LengthOption>("medium");
  const [tone, setTone] = useState<ToneOption>("auto");
  const [pov, setPov] = useState<PovOption>("auto");
  const [includeHighlights, setIncludeHighlights] = useState(true);
  const [pinnedWeight, setPinnedWeight] = useState<1 | 2 | 3>(2);
  const [strict, setStrict] = useState(true);
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [story, setStory] = useState("");

  async function generate() {
    setLoading(true);
    setErr(null);
    setStory("");
    try {
      const qs = new URLSearchParams({
        from,
        to,
        length,
        tone,
        pov,
        highlights: String(includeHighlights),
        pinnedWeight: String(pinnedWeight),
        strict: String(strict),
      });
      if (notes.trim()) qs.set("notes", notes.trim());

      const res = await fetch(`/api/year-story?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to generate the story");
      setStory(json.story);
    } catch (err: unknown) {
      setErr(err instanceof Error ? err.message : "Failed to generate the story");
    } finally {
      setLoading(false);
    }
  }

  function downloadMD() {
    const blob = new Blob([story], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `year-story_${from}_to_${to}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-3xl space-y-6 px-6 py-12">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-indigo-300/80">Year in review</p>
          <h1 className="text-3xl font-semibold md:text-4xl">Generate a faithful yearly story</h1>
          <p className="text-sm text-neutral-400 md:text-base">
            Pick a range, choose the tone, and OneLine will craft a long-form narrative grounded in your daily entries.
          </p>
        </header>

        <section className="grid gap-4 rounded-2xl border border-white/10 bg-neutral-900/60 p-5 md:grid-cols-2">
          <div className="space-y-4">
            <label className="block text-sm">
              From
              <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="block text-sm">
              To
              <input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
            <label className="block text-sm">
              Length
              <select className={inputCls} value={length} onChange={(e) => setLength(e.target.value as LengthOption)}>
                <option value="short">Short (concise)</option>
                <option value="medium">Medium (recommended)</option>
                <option value="long">Long (immersive)</option>
              </select>
            </label>
            <label className="block text-sm">
              Tone
              <select className={inputCls} value={tone} onChange={(e) => setTone(e.target.value as ToneOption)}>
                <option value="auto">Auto — mirror my entries</option>
                <option value="warm">Warm</option>
                <option value="neutral">Neutral</option>
                <option value="poetic">Poetic</option>
                <option value="direct">Direct</option>
              </select>
            </label>
            <label className="block text-sm">
              Point of view
              <select className={inputCls} value={pov} onChange={(e) => setPov(e.target.value as PovOption)}>
                <option value="auto">Auto — infer from entries</option>
                <option value="first">First person</option>
                <option value="third">Close third person</option>
              </select>
            </label>
          </div>

          <div className="space-y-4">
            <label className="block text-sm">
              Weight starred lines
              <select
                className={inputCls}
                value={pinnedWeight}
                onChange={(e) => setPinnedWeight(Number(e.target.value) as 1 | 2 | 3)}
              >
                <option value={1}>x1 — gentle</option>
                <option value={2}>x2 — balanced</option>
                <option value={3}>x3 — heavy emphasis</option>
              </select>
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="size-4 rounded border border-neutral-700 bg-neutral-900"
                checked={includeHighlights}
                onChange={(e) => setIncludeHighlights(e.target.checked)}
              />
              Include “Highlights of the year”
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="size-4 rounded border border-neutral-700 bg-neutral-900"
                checked={strict}
                onChange={(e) => setStrict(e.target.checked)}
              />
              Strict fidelity (no creative leaps)
            </label>
            <label className="block text-sm">
              Notes for the narrator
              <textarea
                className="mt-1 h-28 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Example: Keep sentences short and close with a motivating insight."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={generate}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Generating…" : "Generate"}
          </button>
          {story && (
            <>
              <button
                onClick={() => navigator.clipboard.writeText(story)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-neutral-100 transition hover:bg-white/10"
              >
                Copy
              </button>
              <button
                onClick={downloadMD}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-neutral-100 transition hover:bg-white/10"
              >
                Download .md
              </button>
            </>
          )}
        </div>

        {err && <p className="text-sm text-rose-400">{err}</p>}

        {story && (
          <article className="prose prose-invert max-w-none">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed md:text-base">{story}</pre>
          </article>
        )}
      </div>
    </main>
  );
}
