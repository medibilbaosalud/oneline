// src/app/summaries/StoryGenerator.tsx
"use client";

import { useMemo, useState } from "react";

type Length = "short" | "medium" | "long";
type Tone = "auto" | "calido" | "neutro" | "poetico" | "directo";
type Pov = "auto" | "primera" | "tercera";
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

  // Resolver rango según preset
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

      let json: any = null;
      const isJson = res.headers.get("content-type")?.includes("application/json");
      if (isJson) {
        json = await res.json();
      } else {
        // fallback por si el server devuelve texto
        const txt = await res.text();
        try {
          json = JSON.parse(txt);
        } catch {
          json = { error: txt || "Unexpected response" };
        }
      }

      if (!res.ok) {
        throw new Error(json?.error || res.statusText || "Failed");
      }
      setStory(json?.story || "");
    } catch (e: any) {
      setError(e?.message || "Failed to generate");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full space-y-6 text-zinc-100">
      {/* Controles */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 shadow-sm">
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
              <option value="calido">Warm</option>
              <option value="neutro">Neutral</option>
              <option value="poetico">Poetic</option>
              <option value="directo">Direct</option>
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
              <option value="primera">First person</option>
              <option value="tercera">Third person</option>
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
            {/* Render simple; si usas MDX/markdown parser cámbialo */}
            <pre className="whitespace-pre-wrap break-words text-zinc-100">{story}</pre>
          </article>
        ) : (
          <p className="text-zinc-400">Your story will appear here.</p>
        )}
      </div>
    </div>
  );
}