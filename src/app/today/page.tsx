'use client';

import { useMemo, useState } from 'react';

const QUOTES = [
  { t: 'The smallest step in the right direction ends up being the biggest step of your life.', a: 'Unknown' },
  { t: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', a: 'Will Durant' },
  { t: 'What gets written gets remembered.', a: 'Unknown' },
  { t: 'No zero days. One line is enough.', a: 'OneLine' },
];

const MAX = 300;

function prettyDate(d = new Date()) {
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function TodayPage() {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], []);
  const count = text.length;

  async function handleSave() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      // Ajusta esta llamada a tu API real si ya guardabas las líneas antes:
      await fetch('/api/journal/today', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      // Opcional: feedback
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 text-neutral-50">
      <div className="mx-auto max-w-3xl p-6">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-widest text-neutral-400">Today</p>
          <h1 className="mt-1 text-3xl font-semibold md:text-4xl">{prettyDate()}</h1>
          <p className="mt-4 italic text-neutral-300">
            “{quote.t}” <span className="not-italic opacity-70">— {quote.a}</span>
          </p>
        </header>

        <section className="rounded-2xl bg-neutral-900/60 p-5 ring-1 ring-white/10 backdrop-blur">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={MAX}
            placeholder="One line that captures your day…"
            className="h-48 w-full resize-none bg-transparent leading-relaxed outline-none placeholder:text-neutral-500"
          />
          <div className="mt-4 flex items-center justify-between">
            <span className={`text-sm ${count === MAX ? 'text-rose-400' : 'text-neutral-400'}`}>
              {count}/{MAX}
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setText('')}
                className="rounded-lg bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!text.trim() || saving}
                className="rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white transition hover:bg-indigo-400 disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Save entry'}
              </button>
            </div>
          </div>
        </section>

        <p className="mt-6 text-center text-xs text-neutral-500">
          Tip: one honest sentence beats a perfect paragraph.
        </p>
      </div>
    </main>
  );
}
