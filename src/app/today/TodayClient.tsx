'use client';

import { useEffect, useMemo, useState } from 'react';

const MAX = 300;
const QUOTES = [
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
  { t: 'The best way to predict the future is to invent it.', a: 'Alan Kay' },
  { t: 'No zero days. One line is enough.', a: 'OneLine' },
];

function quoteOfToday() {
  const key = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
  return QUOTES[key % QUOTES.length];
}

type Msg = { text: string; kind: 'ok' | 'error' };

export default function TodayClient() {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [authed, setAuthed] = useState<boolean>(false);
  const quote = useMemo(() => quoteOfToday(), []);

  // Helper para chequear sesión
  async function checkAuth(): Promise<boolean> {
    try {
      const r = await fetch('/api/auth/user', { cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      return Boolean(j?.user || j?.email || j?.id);
    } catch {
      return false;
    }
  }

  // Carga inicial: detecta sesión y, si hay, trae el entry de hoy
  useEffect(() => {
    let active = true;

    const boot = async () => {
      const isAuthed = await checkAuth();
      if (!active) return;
      setAuthed(isAuthed);

      if (isAuthed) {
        try {
          const r = await fetch('/api/journal/today', { cache: 'no-store' });
          if (r.ok) {
            const j = await r.json();
            if (typeof j?.content === 'string') setText(j.content);
          }
        } catch {}
      }
    };

    boot();

    // Rechequear al volver a la pestaña/ventana
    const onVis = () => boot();
    window.addEventListener('focus', onVis);
    document.addEventListener('visibilitychange', onVis);

    return () => {
      active = false;
      window.removeEventListener('focus', onVis);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  async function save() {
    if (!authed) {
      setMsg({ text: 'Please sign in to save.', kind: 'error' });
      return;
    }
    if (!text.trim()) return;

    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch('/api/journal/today', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: text }),
        cache: 'no-store',
      });

      if (r.status === 401) {
        setAuthed(false);
        setMsg({ text: 'Please sign in to save.', kind: 'error' });
        return;
      }
      if (!r.ok) throw new Error('Failed to save');

      setMsg({ text: 'Saved ✓', kind: 'ok' });
      setTimeout(() => setMsg(null), 1500);
    } catch (e: any) {
      setMsg({ text: e?.message || 'Network error', kind: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-neutral-900/60 p-5 shadow-sm">
      <p className="mb-4 italic text-neutral-300">
        “{quote.t}” <span className="not-italic opacity-70">— {quote.a}</span>
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MAX}
        placeholder="One line that captures your day…"
        className="h-48 w-full resize-none bg-transparent leading-relaxed text-zinc-100 outline-none placeholder:text-neutral-500"
      />

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className={`text-sm ${text.length === MAX ? 'text-rose-400' : 'text-neutral-400'}`}>
          {text.length}/{MAX}
        </span>

        <div className="flex items-center gap-3">
          {msg && (
            <span className={`text-sm ${msg.kind === 'ok' ? 'text-emerald-400' : 'text-rose-400'}`}>
              {msg.text}
            </span>
          )}

          {!authed ? (
            <a
              href="/auth"
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Sign in to save
            </a>
          ) : (
            <button
              type="button"
              onClick={save}
              disabled={!text.trim() || saving}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save entry'}
            </button>
          )}

          <button
            type="button"
            onClick={() => setText('')}
            className="rounded-lg bg-neutral-800 px-3 py-2 text-sm text-zinc-100 hover:bg-neutral-700"
          >
            Clear
          </button>
        </div>
      </div>
    </section>
  );
}
```0