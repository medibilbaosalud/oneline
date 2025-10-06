'use client';

import { useEffect, useMemo, useState } from 'react';

type Q = { t: string; a: string };
const MAX = 300;
const QUOTES: Q[] = [
  { t: 'Simplicity is the ultimate sophistication.', a: 'Leonardo da Vinci' },
  // ... (tu lista)
  { t: 'Simplicity is the ultimate sophistication.', a: 'Leonardo da Vinci' },
  { t: 'Stay hungry, stay foolish.', a: 'Steve Jobs' },
  { t: 'The only way to do great work is to love what you do.', a: 'Steve Jobs' },
  { t: 'Have the courage to follow your heart and intuition. They somehow already know what you truly want to become.', a: 'Steve Jobs' },
  { t: 'Innovation distinguishes between a leader and a follower.', a: 'Steve Jobs' },
  { t: 'Simple can be harder than complex; you have to work hard to get your thinking clean to make it simple.', a: 'Steve Jobs' },
  { t: 'Design is not just what it looks like and feels like. Design is how it works.', a: 'Steve Jobs' },
  { t: 'Everything around you that you call life was made up by people that were no smarter than you.', a: 'Steve Jobs' },

  { t: 'The journey of a thousand miles begins with a single step.', a: 'Lao Tzu' },
  { t: 'Act as if what you do makes a difference. It does.', a: 'William James' },
  { t: 'How we spend our days is, of course, how we spend our lives.', a: 'Annie Dillard' },
  { t: 'It is not that we have a short time to live, but that we waste much of it.', a: 'Seneca' },
  { t: 'You have power over your mind — not outside events. Realize this, and you will find strength.', a: 'Marcus Aurelius' },
  { t: "You can't use up creativity. The more you use, the more you have.", a: 'Maya Angelou' },
  { t: 'Be faithful in small things because it is in them that your strength lies.', a: 'Mother Teresa' },
  { t: 'What you seek is seeking you.', a: 'Rumi' },
  { t: 'It does not matter how slowly you go as long as you do not stop.', a: 'Confucius' },
  { t: 'Whatever you can do or dream you can, begin it. Boldness has genius, power and magic in it.', a: 'Johann Wolfgang von Goethe' },
  { t: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', a: 'Will Durant' },
  { t: 'You can do anything, but not everything.', a: 'David Allen' },
  { t: 'If you are going through hell, keep going.', a: 'Winston Churchill' },
  { t: "Whether you think you can, or you think you can't — you're right.", a: 'Henry Ford' },
  { t: 'Simplicity is the ultimate sophistication.', a: 'Leonardo da Vinci' },
  { t: 'The best way to predict the future is to invent it.', a: 'Alan Kay' },
  { t: 'No zero days. One line is enough.', a: 'OneLine' },
];

function prettyDate(d = new Date()) {
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
function quoteOfToday(): Q {
  const key = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
  return QUOTES[key % QUOTES.length];
}

export default function TodayPage() {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'idle'|'saving'|'saved'|'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string|undefined>();
  const quote = useMemo(() => quoteOfToday(), []);

  // Carga el entry existente (si lo hay)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/journal/today', { cache: 'no-store' });
        const json = await res.json();
        if (typeof json?.content === 'string') setText(json.content);
      } catch {}
    })();
  }, []);

  async function handleSave() {
    if (!text.trim()) return;
    setStatus('saving');
    setErrorMsg(undefined);

    try {
      const res = await fetch('/api/journal/today', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setStatus('error');
        setErrorMsg(j?.error ?? 'Could not save. Please try again.');
        return;
      }
      setStatus('saved');
      // Oculta el “Saved” después de unos segundos
      setTimeout(() => setStatus('idle'), 2000);
    } catch (e) {
      setStatus('error');
      setErrorMsg('Network error. Please try again.');
    }
  }

  const count = text.length;

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

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className={`text-sm ${count === MAX ? 'text-rose-400' : 'text-neutral-400'}`}>
              {count}/{MAX}
            </span>

            <div className="flex items-center gap-3">
              {status === 'saved' && (
                <span className="text-emerald-400 text-sm">Saved ✓</span>
              )}
              {status === 'error' && (
                <span className="text-rose-400 text-sm">{errorMsg}</span>
              )}

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
                disabled={!text.trim() || status === 'saving'}
                className="rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white transition hover:bg-indigo-400 disabled:opacity-40"
              >
                {status === 'saving' ? 'Saving…' : 'Save entry'}
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
