'use client';

import { useState } from 'react';

type Summary = {
  id: string;
  period: string;
  start_date: string;
  end_date: string;
  html: string;
  created_at: string;
};

export default function SummariesClient({ items: initial }: { items: Summary[] }) {
  const [items] = useState<Summary[]>(initial);
  const loading = false; // ya viene renderizado desde servidor

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50">
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold mb-6">Summaries</h1>
        {loading && <p className="text-neutral-400">Loading…</p>}
        {!loading && items.length === 0 && (
          <p className="text-neutral-400">No summaries yet.</p>
        )}
        <div className="space-y-4">
          {items.map((s) => (
            <article
              key={s.id}
              className="rounded-2xl bg-neutral-900/60 p-5 ring-1 ring-white/10"
            >
              <header className="mb-3">
                <h2 className="text-lg font-medium capitalize">{s.period} summary</h2>
                <p className="text-xs text-neutral-400">
                  {s.start_date} → {s.end_date}
                </p>
              </header>
              <div
                className="prose prose-invert"
                dangerouslySetInnerHTML={{ __html: s.html }}
              />
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
