'use client';

import { useMemo, useState } from 'react';
import { quoteOfToday } from '@/lib/quotes'; // cambia a '../../lib/quotes' si no usas alias '@'

const MAX_LINES = 5;
const MAX_CHARS = 240;

function clampInput(raw: string) {
  // Normaliza CRLF a \n, limita líneas y luego el total de caracteres
  const lines = raw.replace(/\r/g, '').split('\n').slice(0, MAX_LINES);
  return lines.join('\n').slice(0, MAX_CHARS);
}

function formatLongDate(d = new Date()) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

export default function TodayPage() {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const quote = useMemo(() => quoteOfToday(), []);
  const today = useMemo(() => new Date(), []);
  const dateLabel = useMemo(() => formatLongDate(today), [today]);

  const charCount = text.length;
  const lineCount = text ? text.split('\n').length : 0;

  async function handleSave() {
    const content = text.trim();
    if (!content) return;

    setSaving(true);
    try {
      const res = await fetch('/api/journal/today', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        console.error('Failed to save entry', await res.text());
      } else {
        // Si quieres limpiar después de guardar:
        // setText('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 text-neutral-50">
      <div className="mx-auto max-w-3xl p-6">
        {/* Header */}
        <p className="mb-2 text-xs tracking-wider text-neutral-400">TODAY</p>
        <h1 className="mb-4 text-3xl font-semibold">{dateLabel}</h1>

        {/* Quote of the day */}
        <p className="mb-8 text-lg text-neutral-300">
          <span className="italic">“{quote.text}”</span>
          {quote.author ? <span className="ml-2 text-neutral-400">— {quote.author}</span> : null}
        </p>

        {/* Editor */}
        <section className="rounded-2xl bg-neutral-900/60 p-5 ring-1 ring-white/10 backdrop-blur">
          <label htmlFor="entry" className="sr-only">
            Write your one-line entry
          </label>
          <textarea
            id="entry"
            value={text}
            onChange={(e) => setText(clampInput(e.target.value))}
            maxLength={MAX_CHARS}
            rows={5}
            placeholder="Up to 5 lines — one line that captures your day…"
            className="h-48 w-full resize-none bg-transparent leading-relaxed outline-none placeholder:text-neutral-500"
            spellCheck={false}
          />

          <div className="mt-4 flex items-center justify-between">
            <span
              className={`text-sm ${
                charCount >= MAX_CHARS || lineCount >= MAX_LINES
                  ? 'text-rose-400'
                  : 'text-neutral-400'
              }`}
            >
              {lineCount}/{MAX_LINES} lines · {charCount}/{MAX_CHARS} chars
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

          <p className="mt-3 text-xs text-neutral-500">
            Up to 5 lines • 240 characters. Tip: one honest sentence beats a perfect paragraph.
          </p>
        </section>
      </div>
    </main>
  );
}
