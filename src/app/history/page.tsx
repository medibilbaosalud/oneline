'use client';
import { useEffect, useMemo, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type Entry = { id: string; day: string; content: string; created_at: string };

export default function HistoryPage() {
  const sb = useMemo(() => createClientComponentClient(), []);
  const [items, setItems] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { setItems([]); setLoading(false); return; }
      const { data } = await sb
        .from('journal')
        .select('id, day, content, created_at')
        .eq('user_id', user.id)
        .order('day', { ascending: false })
        .limit(200);
      setItems((data ?? []) as Entry[]);
      setLoading(false);
    })();
  }, [sb]);

  return (
    <main className="min-h-dvh bg-neutral-950 text-neutral-50">
      <div className="mx-auto max-w-3xl px-4 py-5 sm:p-6">
        <h1 className="mb-5 text-2xl font-semibold sm:mb-8 sm:text-3xl">History</h1>
        {loading && <p className="text-neutral-400">Loading…</p>}
        {!loading && items.length === 0 && <p className="text-neutral-400">No entries yet.</p>}

        <ul className="grid gap-3 sm:gap-4">
          {items.map(e => (
            <li key={e.id} className="rounded-2xl border border-white/10 bg-neutral-900/60 p-4 ring-1 ring-white/10">
              <div className="flex items-center justify-between gap-3">
                <time className="text-xs font-medium text-neutral-300 sm:text-sm">
                  {new Date(e.day || e.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </time>
                {/* Aquí podrías poner Edit/Delete más adelante */}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-200">{e.content}</p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}