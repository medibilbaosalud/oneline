"use client";
import { useState } from "react";

export default function YearStoryPage() {
  const y = new Date().getFullYear();
  const [from, setFrom] = useState(`${y}-01-01`);
  const [to, setTo] = useState(`${y}-12-31`);
  const [onlyPinned, setOnlyPinned] = useState(false);

  // Ahora con AUTO por defecto para tono/voz (imita lo que escribes)
  const [length, setLength] = useState<"short"|"medium"|"long">("medium");
  const [tone, setTone] = useState<"auto"|"calido"|"neutro"|"poetico"|"directo">("auto");
  const [pov, setPov] = useState<"auto"|"primera"|"tercera">("auto");
  const [highlights, setHighlights] = useState(true);
  const [pinnedWeight, setPinnedWeight] = useState<1|2|3>(2);
  const [strict, setStrict] = useState(true);
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [story, setStory] = useState("");

  async function generate() {
    setLoading(true); setErr(null); setStory("");
    try {
      const qs = new URLSearchParams({
        from, to,
        onlyPinned: String(onlyPinned),
        length, tone, pov,
        highlights: String(highlights),
        pinnedWeight: String(pinnedWeight),
        strict: String(strict),
        notes,
      });
      const res = await fetch(`/api/year-story?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error generando historia");
      setStory(json.story);
    } catch (e: any) {
      setErr(e.message || "Error generando historia");
    } finally {
      setLoading(false);
    }
  }

  function downloadMD() {
    const blob = new Blob([story], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `year-story_${from}_a_${to}.md`;
    a.click(); URL.revokeObjectURL(url);
  }

  const inputCls = "w-full mt-1 p-2 rounded bg-neutral-900 text-neutral-100 border border-neutral-700";

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Year Story</h1>

      <div className="grid sm:grid-cols-3 gap-3">
        <label className="text-sm">Desde
          <input type="date" className={inputCls} value={from} onChange={e=>setFrom(e.target.value)} />
        </label>
        <label className="text-sm">Hasta
          <input type="date" className={inputCls} value={to} onChange={e=>setTo(e.target.value)} />
        </label>
        <label className="text-sm flex items-end gap-2">
          <input type="checkbox" checked={onlyPinned} onChange={e=>setOnlyPinned(e.target.checked)} />
          Solo entradas “pinned”
        </label>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <label className="text-sm">Longitud
          <select className={inputCls} value={length} onChange={e=>setLength(e.target.value as any)}>
            <option value="short">Corta</option>
            <option value="medium">Media</option>
            <option value="long">Larga</option>
          </select>
        </label>
        <label className="text-sm">Tono
          <select className={inputCls} value={tone} onChange={e=>setTone(e.target.value as any)}>
            <option value="auto">Auto (imitar mis entradas)</option>
            <option value="calido">Cálido</option>
            <option value="neutro">Neutro</option>
            <option value="poetico">Poético</option>
            <option value="directo">Directo</option>
          </select>
        </label>
        <label className="text-sm">Voz
          <select className={inputCls} value={pov} onChange={e=>setPov(e.target.value as any)}>
            <option value="auto">Auto (deducir)</option>
            <option value="primera">Primera persona</option>
            <option value="tercera">Tercera cercana</option>
          </select>
        </label>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <label className="text-sm">Peso “pinned”
          <select className={inputCls} value={pinnedWeight} onChange={e=>setPinnedWeight(Number(e.target.value) as any)}>
            <option value={1}>x1 (suave)</option>
            <option value={2}>x2 (recomendado)</option>
            <option value={3}>x3 (fuerte)</option>
          </select>
        </label>
        <label className="text-sm flex items-end gap-2">
          <input type="checkbox" checked={highlights} onChange={e=>setHighlights(e.target.checked)} />
          Añadir “Destellos” (Top-10)
        </label>
        <label className="text-sm flex items-end gap-2">
          <input type="checkbox" checked={strict} onChange={e=>setStrict(e.target.checked)} />
          Modo estricto (0 invenciones)
        </label>
      </div>

      <div>
        <label className="text-sm block mb-1">Notas para el narrador (opcional)</label>
        <textarea
          className="w-full h-24 rounded bg-neutral-900 text-neutral-100 border border-neutral-700 p-2"
          placeholder="Ej.: Prefiero frases cortas y cierre motivador. Evita metáforas."
          value={notes}
          onChange={(e)=>setNotes(e.target.value)}
        />
      </div>

      <div className="flex gap-3">
        <button onClick={generate} disabled={loading}
                className="px-4 py-2 rounded bg-white/20 hover:bg-white/30 disabled:opacity-60">
          {loading ? "Generando…" : "Generar"}
        </button>
        {story && (
          <>
            <button onClick={() => navigator.clipboard.writeText(story)}
                    className="px-4 py-2 rounded bg-white/10 hover:bg-white/20">Copiar</button>
            <button onClick={downloadMD}
                    className="px-4 py-2 rounded bg-white/10 hover:bg-white/20">Descargar .md</button>
          </>
        )}
      </div>

      {err && <p className="text-red-400 text-sm">{err}</p>}

      {story && (
        <article className="prose prose-invert max-w-none">
          <pre className="whitespace-pre-wrap leading-relaxed">{story}</pre>
        </article>
      )}
    </div>
  );
}
