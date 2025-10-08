'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type Entry = { day: string; content: string | null };

export default function EditDayPage() {
  const { day } = useParams<{ day: string }>();
  const router = useRouter();
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setStatus(null);
      try {
        const res = await fetch(`/api/journal/${day}`, { cache: 'no-store' });
        const json = await res.json();
        setContent(json.entry?.content ?? '');
      } finally {
        setLoading(false);
      }
    })();
  }, [day]);

  async function save() {
    setStatus('Saving…');
    try {
      const res = await fetch(`/api/journal/${day}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const txt = await res.text();
      let json: any;
      try { json = JSON.parse(txt); } catch { throw new Error(txt); }
      if (!res.ok) throw new Error(json?.error || 'Failed');
      setStatus('Saved ✔');
      setTimeout(() => router.push('/history'), 600);
    } catch (e: any) {
      setStatus(e.message);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-3xl font-semibold">Edit {day}</h1>

      {loading ? (
        <p className="text-neutral-400">Loading…</p>
      ) : (
        <>
          <textarea
            className="h-64 w-full resize-none rounded-2xl bg-neutral-900/60 p-4 ring-1 ring-white/10 outline-none"
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 300))}
            maxLength={300}
          />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-neutral-400 text-sm">{content.length}/300</span>
            <button
              onClick={save}
              className="rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white hover:bg-indigo-400"
            >
              Save
            </button>
          </div>
          {status && <p className="mt-2 text-sm text-neutral-300">{status}</p>}
        </>
      )}
    </main>
  );
}
