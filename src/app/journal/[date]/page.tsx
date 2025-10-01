'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

type Q = { t: string; a: string };

const MAX_LINES = 5;
const MAX_CHARS = 240;

function clampInput(raw: string) {
  let lines = raw.replace(/\r/g, '').split('\n').slice(0, MAX_LINES);
  return lines.join('\n').slice(0, MAX_CHARS);
}

function isValidISO(d: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}
function todayISO() {
  const d = new Date();
  d.setHours(0,0,0,0);
  return d.toISOString().slice(0,10);
}
function shift(dateISO: string, deltaDays: number) {
  const d = new Date(dateISO + 'T00:00:00');
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString().slice(0,10);
}
function notFuture(dateISO: string) {
  const t = todayISO();
  return dateISO <= t;
}

// ——— quotes (puedes reutilizar tus listas) ———
const QUOTES: Q[] = [
  { t: 'The smallest step in the right direction ends up being the biggest step of your life.', a: 'Unknown' },
  { t: 'Stay hungry. Stay foolish.', a: 'Steve Jobs' },
  { t: 'The people who are crazy enough to think they can change the world are the ones who do.', a: 'Steve Jobs' },
  { t: 'Simplicity is the ultimate sophistication.', a: 'Steve Jobs' },
  { t: 'We are what we repeatedly do. Excellence, then, is not an act but a habit.', a: 'Will Durant' },
];
function quoteOfToday(seed: string) {
  let x = 0;
  for (const ch of seed) x = (x * 33 + ch.charCodeAt(0)) % 2147483647;
  return QUOTES[x % QUOTES.length];
}

export default function DayPage() {
  const router = useRouter();
  const params = useParams<{ date: string }>();
  const date = isValidISO(params.date) ? params.date : todayISO();

  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const quote = useMemo(() => quoteOfToday(date), [date]);

  // cargar contenido existente
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/journal/${date}`);
        if (!res.ok) throw new Error('Load error');
        const json = await res.json();
        if (!cancelled) setText((json.content ?? '').toString());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [date]);

  const charCount = text.length;
  const lineCount = text ? text.split('\n').length : 0;

  async function handleSave() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/journal/${date}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j?.error ?? 'Error saving');
      }
    } finally {
      setSaving(false);
    }
  }

  const prev = shift(date, -1);
  const next = shift(date, 1);

  return (
    <main className="min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 text-neutral-50">
      <div className="mx-auto max-w-3xl p-6 space-y-6">
        {/* header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs tracking-widest text-neutral-400">JOURNAL</p>
            <h1 className="text-3xl font-semibold">
              {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/day/${prev}`)}
              className="rounded-lg bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700"
            >
              ◀︎ Yesterday
            </button>

            <input
              type="date"
              max={todayISO()}
              value={date}
              onChange={(e) => router.push(`/day/${e.target.value}`)}
              className="rounded-lg bg-neutral-900 px-3 py-2 text-sm text-neutral-200 ring-1 ring-white/10"
            />

            <button
              disabled={!notFuture(next)}
              onClick={() => router.push(`/day/${next}`)}
              className="rounded-lg bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700 disabled:opacity-30"
            >
              Next ▶︎
            </button>
          </div>
        </div>

        <p className="text-neutral-400 italic">
          “{quote.t}” — {quote.a}
        </p>

        <section className="rounded-2xl bg-neutral-900/60 p-5 ring-1 ring-white/10 backdrop-blur">
          <textarea
            value={text}
            onChange={(e) => setText(clampInput(e.target.value))}
            maxLength={MAX_CHARS}
            rows={5}
            placeholder="Up to 5 lines — one line that captures your day…"
            className="h-48 w-full resize-none bg-transparent leading-relaxed outline-none placeholder:text-neutral-500"
            disabled={loading}
          />
          <div className="mt-4 flex items-center justify-between">
            <span className={`text-sm ${charCount >= MAX_CHARS || lineCount >= MAX_LINES ? 'text-rose-400' : 'text-neutral-400'}`}>
              {lineCount}/{MAX_LINES} lines · {charCount}/{MAX_CHARS} chars
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setText('')}
                className="rounded-lg bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700"
                disabled={loading}
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!text.trim() || saving || loading}
                className="rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white transition hover:bg-indigo-400 disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Save entry'}
              </button>
            </div>
          </div>
          <p className="mt-3 text-xs text-neutral-500">
            Backfill any past day (no future). Tip: one honest sentence beats a perfect paragraph.
          </p>
        </section>
      </div>
    </main>
  );
}
