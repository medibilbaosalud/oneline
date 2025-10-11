'use client';

import { useEffect, useState } from 'react';

type Entry = { id: string; content: string; created_at: string };

export default function HistoryClient() {
  const [entries, setEntries] = useState<Entry[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/history', { cache: 'no-store' });
        const j = await r.json();
        setEntries(Array.isArray(j?.entries) ? j.entries : []);
      } catch {
        setEntries([]);
      }
    })();
  }, []);

  if (entries === null) {
    return <p className="text-neutral-400">Loading…</p>;
  }

  if (!entries.length) {
    return <p className="mt-8 text-neutral-400">No entries yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-4">
      {entries.map((e) => (
        <li
          key={e.id}
          className="rounded-2xl border border-white/10 bg-neutral-900/60 p-4 shadow-sm"
        >
          <div className="text-sm text-neutral-400">
            {new Date(e.created_at).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
          <div className="mt-2 text-lg leading-relaxed text-neutral-100">{e.content}</div>
        </li>
      ))}
    </ul>
  );
}