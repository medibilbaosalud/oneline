'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

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

type StreakData = {
  current: number;
  longest: number;
  nextMilestone: number | null;
  progress: number;
};

const COMPANIONS = [
  { min: 0, emoji: '🦊', name: 'Lumen the Fox', blurb: 'Keeps you present through the first seven days.' },
  { min: 21, emoji: '🦉', name: 'Atlas the Owl', blurb: 'Appears at 21 days to sharpen your reflection ritual.' },
  { min: 60, emoji: '🐋', name: 'Nami the Whale', blurb: 'Surfaces at 60 days to honour your depth and consistency.' },
  { min: 120, emoji: '🐉', name: 'Nova the Dragonfly', blurb: 'Unlocks at 120 days to celebrate your long-game mindset.' },
];

function companionForStreak(current: number) {
  const unlocked = [...COMPANIONS].filter((c) => current >= c.min);
  return (unlocked.length ? unlocked[unlocked.length - 1] : COMPANIONS[0]) ?? COMPANIONS[0];
}

function nextCompanion(current: number) {
  return COMPANIONS.find((c) => c.min > current) ?? null;
}

function quoteOfToday() {
  const key = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
  return QUOTES[key % QUOTES.length];
}

export default function TodayClient() {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const quote = useMemo(() => quoteOfToday(), []);

  const loadStreak = useCallback(async () => {
    try {
      const response = await fetch('/api/journal/streak', { cache: 'no-store' });
      if (response.status === 401) {
        setNeedLogin(true);
        setStreak(null);
        return;
      }
      if (!response.ok) return;
      const payload = (await response.json()) as StreakData;
      setStreak(payload);
    } catch {
      // ignore streak errors silently
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/journal/today', { cache: 'no-store' });
        if (r.status === 401) {
          setNeedLogin(true);
          return;
        }
        const j = await r.json();
        setNeedLogin(false);
        if (typeof j?.content === 'string') setText(j.content);
        loadStreak();
      } catch {
        // silencio
      }
    })();
  }, [loadStreak]);

  async function save() {
    if (!text.trim()) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch('/api/journal/today', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      if (r.status === 401) {
        setNeedLogin(true);
        setMsg('Please sign in to save.');
        return;
      }
      if (!r.ok) throw new Error('Failed to save');
      setNeedLogin(false);
      setMsg('Saved ✓');
      loadStreak();
      setTimeout(() => setMsg(null), 1500);
    } catch (e) {
      const message = e instanceof Error && e.message ? e.message : 'Network error';
      setMsg(message);
    } finally {
      setSaving(false);
    }
  }

  const currentCompanion = companionForStreak(streak?.current ?? 0);
  const upcomingCompanion = nextCompanion(streak?.current ?? 0);
  const progressPercent = Math.round((streak?.progress ?? 0) * 100);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
      <section className="flex min-h-[420px] flex-col rounded-2xl border border-white/10 bg-neutral-900/60 p-5 shadow-sm">
        <p className="mb-4 italic text-neutral-300">
          “{quote.t}” <span className="not-italic opacity-70">— {quote.a}</span>
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX}
          placeholder="One line that captures your day…"
          className="min-h-[220px] w-full flex-1 resize-none rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-base leading-relaxed outline-none placeholder:text-neutral-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
        />

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className={`text-sm ${text.length === MAX ? 'text-rose-400' : 'text-neutral-400'}`}>
            {text.length}/{MAX}
          </span>

          <div className="flex flex-wrap items-center gap-3">
            {msg && <span className="text-sm text-emerald-400">{msg}</span>}
            {needLogin && (
              <a
                href="/auth"
                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              >
                Sign in to save
              </a>
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
              onClick={save}
              disabled={!text.trim() || saving || needLogin}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save entry'}
            </button>
          </div>
        </div>
      </section>

      <aside className="rounded-2xl border border-white/10 bg-neutral-900/40 p-5 shadow-sm">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Momentum</p>
            <h2 className="mt-2 text-lg font-semibold text-white">Your streak & companion</h2>
          </div>
          <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-medium text-neutral-300">
            {needLogin ? 'Sign in' : 'Auto-synced'}
          </span>
        </header>

        {needLogin ? (
          <div className="mt-6 space-y-4 text-sm text-neutral-400">
            <p>Sign in to start tracking streaks, companions, and rewards.</p>
            <a
              href="/auth"
              className="inline-flex items-center justify-center rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
            >
              Sign in / Sign up
            </a>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>Current streak</span>
                <span>Longest</span>
              </div>
              <div className="mt-2 flex items-end justify-between">
                <div>
                  <p className="text-4xl font-semibold text-white">
                    {streak ? (
                      <>
                        {streak.current}
                        <span className="ml-1 text-lg text-neutral-500">days</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">
                    {streak?.nextMilestone
                      ? `Next badge at ${streak.nextMilestone} days`
                      : 'You have unlocked every badge'}
                  </p>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-emerald-300">
                  {streak ? `${streak.longest} days` : '—'}
                </div>
              </div>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-neutral-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-indigo-500"
                  style={{ width: `${Math.min(100, progressPercent)}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Companion</p>
                  <p className="mt-1 text-lg font-semibold text-white">{currentCompanion.name}</p>
                </div>
                <span className="text-3xl" aria-hidden>{currentCompanion.emoji}</span>
              </div>
              <p className="mt-3 text-xs text-neutral-400">{currentCompanion.blurb}</p>

              <div className="mt-4 grid grid-cols-3 gap-3 text-center text-[11px] text-neutral-400">
                {COMPANIONS.map((companion) => {
                  const unlocked = (streak?.current ?? 0) >= companion.min;
                  return (
                    <div
                      key={companion.name}
                      className={`rounded-xl border px-3 py-2 ${
                        unlocked
                          ? 'border-white/20 bg-white/10 text-white'
                          : 'border-white/10 bg-white/[0.04] text-neutral-500'
                      }`}
                    >
                      <span className="text-xl" aria-hidden>
                        {companion.emoji}
                      </span>
                      <p className="mt-1 font-medium">{companion.name.split(' ')[0]}</p>
                      <p className="text-[10px] uppercase tracking-[0.18em]">{companion.min}d</p>
                    </div>
                  );
                })}
              </div>

              {upcomingCompanion && (
                <p className="mt-4 text-[11px] text-neutral-500">
                  {`Stay steady — ${upcomingCompanion.name} unlocks at ${upcomingCompanion.min} days.`}
                </p>
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}