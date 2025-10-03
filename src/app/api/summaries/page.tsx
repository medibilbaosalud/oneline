'use client';
import { useEffect, useState } from 'react';

type Summary = { id:string; period:string; start_date:string; end_date:string; html:string; created_at:string };

export default function SummariesPage() {
  const [items, setItems] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/summaries', { cache: 'no-store' });
    const json = await res.json();
    setItems(json.items ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleGenerate() {
    const res = await fetch('/api/summaries/ensure', { method: 'POST' });
    await res.json();
    await load();
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Summaries</h1>
        <button onClick={handleGenerate} className="rounded-lg bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-400">
          Generate summary
        </button>
      </div>

      {loading ? <p className="text-neutral-400">Loading…</p> : (
        <div className="space-y-4">
          {items.map(s => (
            <article key={s.id} className="rounded-2xl bg-neutral-900/60 p-5 ring-1 ring-white/10">
              <header className="mb-3">
                <h2 className="text-lg font-medium capitalize">{s.period} summary</h2>
                <p className="text-xs text-neutral-400">{s.start_date} → {s.end_date}</p>
              </header>
              <div className="prose prose-invert" dangerouslySetInnerHTML={{ __html: s.html }} />
            </article>
          ))}
          {items.length === 0 && <p className="text-neutral-400">No summaries yet.</p>}
        </div>
      )}
    </main>
  );
}
