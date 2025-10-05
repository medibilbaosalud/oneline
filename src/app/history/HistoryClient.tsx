'use client';

import { useEffect, useMemo, useState } from 'react';

type Entry = {
  id: string;
  content: string;
  created_at: string;
};

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}
function thirtyDaysAgoISO() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

export default function HistoryClient() {
  const [from, setFrom] = useState(thirtyDaysAgoISO());
  const [to, setTo] = useState(todayISO());
  const [items, setItems] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);

  // Para el resumen generado
  const [making, setMaking] = useState(false);
  const [story, setStory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchEntries() {
    setLoading(true);
    try {
      const res = await fetch(`/api/journal?from=${from}&to=${to}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error fetching entries');
      setItems(json.items ?? []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchEntries(); }, []); // carga inicial

  async function generateSummary() {
    setMaking(true);
    setStory(null); setError(null);
    try {
      // Reutilizamos tu endpoint existente que usabas con YearStoryButton
      const res = await fetch(`/api/year-story?from=${from}&to=${to}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error generating summary');
      setStory(json.story);
      // si ese endpoint ya guarda en summaries, listo; si no, puedes
      // crear aquí un POST a /api/summaries para persistirlo
    } catch (e: any) {
      setError(e.message);
    } finally {
      setMaking(false);
    }
  }

  const rangeLabel = useMemo(() => {
    return new Date(from).toLocaleDateString() + ' → ' + new Date(to).toLocaleDateString();
  }, [from, to]);

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-col">
          <span className="text-xs text-neutral-400">From</span>
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg bg-neutral-900 px-3 py-2 ring-1 ring-white/10"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-neutral-400">To</span>
          <input
            type="date"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg bg-neutral-900 px-3 py-2 ring-1 ring-white/10"
          />
        </label>
        <div className="flex gap-3">
          <button
            onClick={fetchEntries}
            className="rounded-lg bg-neutral-800 px-4 py-2 text-sm hover:bg-neutral-700"
            disabled={loading}
          >
            {loading ? 'Loading…' : 'Apply'}
          </button>
          <button
            onClick={generateSummary}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-40"
            disabled={making || loading || items.length === 0}
            title={items.length === 0 ? 'No entries in range' : ''}
          >
            {making ? 'Generating…' : 'Generate summary'}
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="rounded-2xl bg-neutral-900/60 ring-1 ring-white/10">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <p className="text-sm text-neutral-300">Entries: {items.length} · {rangeLabel}</p>
        </div>
        <ul className="divide-y divide-white/5">
          {items.map((e) => (
            <li key={e.id} className="px-4 py-3">
              <p className="text-xs text-neutral-400">
                {new Date(e.created_at).toLocaleString()}
              </p>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed">
                {e.content}
              </p>
            </li>
          ))}
          {items.length === 0 && !loading && (
            <li className="px-4 py-8 text-center text-neutral-500">No entries in this range.</li>
          )}
        </ul>
      </div>

      {/* Resultado del resumen */}
      {story && (
        <section className="rounded-2xl bg-neutral-900/60 p-4 ring-1 ring-white/10">
          <h2 className="mb-3 text-lg font-semibold">Summary for {rangeLabel}</h2>
          <article className="prose prose-invert max-w-none">
            <pre className="whitespace-pre-wrap">{story}</pre>
          </article>
        </section>
      )}

      {error && <p className="text-rose-400 text-sm">{error}</p>}
    </div>
  );
}
