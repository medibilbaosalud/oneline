'use client';

import { useMemo, useState } from 'react';
type Q = { t: string; a: string };

// —— Límites recomendados ——
const MAX_LINES = 5;
const MAX_CHARS = 240;

// (…) tus QUOTES y resto igual…

function clampInput(raw: string) {
  // normalizamos saltos de línea y limitamos a N líneas
  let lines = raw.replace(/\r/g, '').split('\n').slice(0, MAX_LINES);
  // ahora limitamos el total de caracteres
  const joined = lines.join('\n').slice(0, MAX_CHARS);
  return joined;
}

export default function TodayPage() {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const quote = useMemo(() => quoteOfToday(), []);

  const charCount = text.length;
  const lineCount = text ? text.split('\n').length : 0;

  async function handleSave() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/journal/today', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      // feedback opcional
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 text-neutral-50">
      <div className="mx-auto max-w-3xl p-6">
        {/* cabecera y cita igual… */}

        <section className="rounded-2xl bg-neutral-900/60 p-5 ring-1 ring-white/10 backdrop-blur">
          <textarea
            value={text}
            onChange={(e) => setText(clampInput(e.target.value))}
            maxLength={MAX_CHARS} // redundante pero útil para IME móviles
            rows={5}
            placeholder="Up to 5 lines — one line that captures your day…"
            className="h-48 w-full resize-none bg-transparent leading-relaxed outline-none placeholder:text-neutral-500"
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
