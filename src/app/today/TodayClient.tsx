'use client';

// SECURITY: This client component never sends plaintext to the server; entries are encrypted locally before POSTing.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProductTourAssistant } from '@/components/ProductTourAssistant';
import VaultGate from '@/components/VaultGate';
import { useVault } from '@/hooks/useVault';
import { encryptText, decryptText } from '@/lib/crypto';

const MAX = 333;
const QUOTES = [
  { t: 'Simplicity is the ultimate sophistication.', a: 'Leonardo da Vinci' },
  { t: 'Stay hungry, stay foolish.', a: 'Steve Jobs' },
  { t: 'The only way to do great work is to love what you do.', a: 'Steve Jobs' },
  {
    t: 'Have the courage to follow your heart and intuition. They somehow already know what you truly want to become.',
    a: 'Steve Jobs',
  },
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
  {
    t: 'Whatever you can do or dream you can, begin it. Boldness has genius, power and magic in it.',
    a: 'Johann Wolfgang von Goethe',
  },
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

function ymdUTC(date = new Date()) {
  const iso = new Date(date).toISOString();
  return iso.slice(0, 10);
}

function formatWindowLabel(window: { start: string; end: string }) {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const start = new Date(`${window.start}T00:00:00Z`);
    const end = new Date(`${window.end}T00:00:00Z`);
    return `${formatter.format(start)} → ${formatter.format(end)}`;
  } catch {
    return `${window.start} → ${window.end}`;
  }
}

function humanizePeriod(period: SummaryReminder['period']) {
  return period.charAt(0).toUpperCase() + period.slice(1);
}

type EntryPayload = {
  id?: string;
  content_cipher?: string | null;
  iv?: string | null;
  content?: string | null;
};

type SummaryReminder = {
  due: boolean;
  period: 'weekly' | 'monthly' | 'yearly';
  window: { start: string; end: string };
  dueSince: string | null;
  lastSummaryAt: string | null;
};

export default function TodayClient() {
  const { dataKey } = useVault();
  const router = useRouter();
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [syncSignal, setSyncSignal] = useState(0);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [pendingEntry, setPendingEntry] = useState<EntryPayload | null>(null);
  const [legacyReadOnly, setLegacyReadOnly] = useState(false);
  const [loadingEntry, setLoadingEntry] = useState(true);
  const todayString = useMemo(() => ymdUTC(), []);
  const [selectedDay, setSelectedDay] = useState(todayString);
  const isToday = selectedDay === todayString;
  const yesterdayString = useMemo(() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 1);
    return ymdUTC(d);
  }, []);
  const quote = useMemo(() => quoteOfToday(), []);
  const displayDate = useMemo(() => {
    try {
      const parsed = new Date(`${selectedDay}T00:00:00.000Z`);
      if (Number.isNaN(parsed.getTime())) return selectedDay;
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(parsed);
    } catch {
      return selectedDay;
    }
  }, [selectedDay]);
  const [summaryReminder, setSummaryReminder] = useState<SummaryReminder | null>(null);
  const [showSummaryReminder, setShowSummaryReminder] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/summaries/reminder', { cache: 'no-store' });
        if (!res.ok) {
          if (res.status === 401 && !cancelled) {
            setSummaryReminder(null);
          }
          return;
        }
        const payload = (await res.json().catch(() => null)) as
          | { reminder?: SummaryReminder | null }
          | null;
        if (cancelled) return;
        if (payload?.reminder?.due) {
          setSummaryReminder(payload.reminder);
          setShowSummaryReminder(true);
        } else {
          setSummaryReminder(payload?.reminder ?? null);
        }
      } catch {
        if (!cancelled) {
          setSummaryReminder(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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
    function handleSynced() {
      setSyncSignal((value) => value + 1);
    }

    window.addEventListener('supabase-session-synced', handleSynced);

    return () => {
      window.removeEventListener('supabase-session-synced', handleSynced);
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoadingEntry(true);
      setMsg(null);
      setPendingEntry(null);
      setEntryId(null);
      setLegacyReadOnly(false);
      setText('');
      try {
        const endpoint = isToday ? '/api/journal/today' : `/api/journal/day/${selectedDay}`;
        const r = await fetch(endpoint, { cache: 'no-store' });
        if (!active) return;
        if (r.status === 401) {
          setNeedLogin(true);
          setPendingEntry(null);
          setEntryId(null);
          setText('');
          return;
        }
        const j = (await r.json()) as EntryPayload | null;
        setNeedLogin(false);
        setPendingEntry(j);
        setEntryId(j?.id ?? null);
        if (isToday) {
          loadStreak();
        }
      } catch {
        if (!active) return;
        setPendingEntry(null);
      } finally {
        if (active) setLoadingEntry(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isToday, loadStreak, selectedDay, syncSignal]);

  useEffect(() => {
    if (!pendingEntry) {
      setLegacyReadOnly(false);
      setText('');
      return;
    }
    if (pendingEntry.content_cipher && pendingEntry.iv) {
      if (!dataKey) return;
      decryptText(dataKey, pendingEntry.content_cipher, pendingEntry.iv)
        .then((plain) => {
          setText(plain);
          setLegacyReadOnly(false);
        })
        .catch(() => {
          if (typeof pendingEntry.content === 'string' && pendingEntry.content.length > 0) {
            setText(pendingEntry.content);
            setLegacyReadOnly(true);
            setMsg(
              'Encrypted copy could not be unlocked — showing legacy text. Press “Save entry” to re-encrypt it with your vault.',
            );
          } else {
            setMsg(
              'We could not decrypt this entry. Confirm you are using the original passphrase and try again.',
            );
            setText('');
            setLegacyReadOnly(false);
          }
        });
    } else if (typeof pendingEntry.content === 'string' && pendingEntry.content.length > 0) {
      setText(pendingEntry.content);
      setLegacyReadOnly(true);
    } else {
      setLegacyReadOnly(false);
      setText('');
    }
  }, [pendingEntry, dataKey]);

  async function save() {
    if (needLogin) {
      setMsg('Please sign in to save.');
      return;
    }
    if (!dataKey) {
      setMsg('Unlock your vault to save.');
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) return;
    setSaving(true);
    setMsg(null);
    try {
      const enc = await encryptText(dataKey, trimmed);
      const endpoint = isToday ? '/api/journal/today' : `/api/journal/day/${selectedDay}`;
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: entryId, content_cipher: enc.cipher_b64, iv: enc.iv_b64 }),
      });
      if (r.status === 401) {
        setNeedLogin(true);
        setMsg('Please sign in to save.');
        return;
      }
      if (!r.ok) throw new Error('Failed to save');
      const json = (await r.json()) as { id?: string } | null;
      const newId = json?.id ?? entryId;
      setEntryId(newId ?? null);
      setPendingEntry({ id: newId ?? undefined, content_cipher: enc.cipher_b64, iv: enc.iv_b64 });
      setLegacyReadOnly(false);
      setMsg(isToday ? 'Saved ✓' : `Saved for ${selectedDay} ✓`);
      if (isToday) {
        loadStreak();
      }
      setTimeout(() => setMsg(null), 1500);
    } catch (e) {
      const message = e instanceof Error && e.message ? e.message : 'Network error';
      setMsg(message);
    } finally {
      setSaving(false);
    }
  }

  if (needLogin) {
    return (
      <div className="rounded-3xl border border-white/10 bg-neutral-950/70 p-8 text-center text-zinc-100">
        <p className="text-lg font-semibold">Sign in to keep your streak going.</p>
        <p className="mt-3 text-sm text-zinc-400">
          Your entries stay encrypted end-to-end. Once you sign in you can unlock them locally with your passphrase.
        </p>
        <a
          href="/auth"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Sign in / Sign up
        </a>
      </div>
    );
  }

  const currentCompanion = companionForStreak(streak?.current ?? 0);
  const upcomingCompanion = nextCompanion(streak?.current ?? 0);
  const progressPercent = Math.round((streak?.progress ?? 0) * 100);

  return (
    <div className="space-y-6">
      <ProductTourAssistant />
      <VaultGate>
        <div className="space-y-6">
          {summaryReminder && summaryReminder.due && showSummaryReminder && (
            <div className="rounded-2xl border border-indigo-500/40 bg-indigo-500/15 p-4 text-sm text-indigo-100">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{humanizePeriod(summaryReminder.period)} story ready</p>
                  <p className="mt-1 text-xs text-indigo-100/80">
                    Generate your recap for {formatWindowLabel(summaryReminder.window)} with your saved preferences.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSummaryReminder(false);
                      router.push(`/summaries?from=${summaryReminder.window.start}&to=${summaryReminder.window.end}`);
                    }}
                    className="rounded-xl bg-indigo-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-400"
                  >
                    Generate now
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSummaryReminder(false)}
                    className="rounded-xl border border-white/20 px-4 py-2 text-xs font-medium text-indigo-100 transition hover:bg-indigo-500/10"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
            <section className="flex min-h-[420px] flex-col rounded-2xl border border-white/10 bg-neutral-900/60 p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Entry for</p>
                  <h2 className="mt-1 text-xl font-semibold text-white">{displayDate}</h2>
                  {!isToday && (
                    <p className="text-xs text-neutral-400">Use the exact same passphrase — older entries stay locked without it.</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    max={todayString}
                    value={selectedDay}
                    onChange={(event) => {
                      const next = event.target.value;
                      if (/^\d{4}-\d{2}-\d{2}$/.test(next)) {
                        const capped = next > todayString ? todayString : next;
                        setSelectedDay(capped);
                      }
                    }}
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedDay(todayString)}
                    disabled={isToday}
                    className="rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-xs font-medium text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-50"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDay(yesterdayString)}
                    disabled={selectedDay === yesterdayString}
                    className="rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-xs font-medium text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-50"
                  >
                    Yesterday
                  </button>
                </div>
              </div>
              <p className="mb-4 italic text-neutral-300">
                “{quote.t}” <span className="not-italic opacity-70">— {quote.a}</span>
              </p>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={MAX}
                disabled={legacyReadOnly || saving || loadingEntry}
                placeholder="One line that captures your day…"
                className="min-h-[220px] w-full flex-1 resize-none rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-base leading-relaxed text-zinc-100 outline-none placeholder:text-neutral-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 disabled:cursor-not-allowed disabled:opacity-70"
              />

              {!loadingEntry && !legacyReadOnly && !text && !pendingEntry?.content_cipher && (
                <p className="mt-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-neutral-300">
                  No entry saved for this date yet — write up to 333 characters to backfill it securely.
                </p>
              )}

              {legacyReadOnly && (
                <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                  Legacy entry detected. Press “Save entry” once to encrypt it with your new vault.
                </p>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className={`text-sm ${text.length === MAX ? 'text-rose-400' : 'text-neutral-400'}`}>
                  {text.length}/{MAX}
                </span>

                <div className="flex flex-wrap items-center gap-3">
                  {msg && <span className="text-sm text-emerald-400">{msg}</span>}
                  <button
                    type="button"
                    onClick={() => {
                      setText('');
                      setLegacyReadOnly(false);
                    }}
                    disabled={saving || loadingEntry}
                    className="rounded-lg bg-neutral-800 px-3 py-2 text-sm text-zinc-200 transition hover:bg-neutral-700 disabled:opacity-50"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={save}
                    disabled={!text.trim() || saving || loadingEntry}
                    className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-40"
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
                  Auto-synced
                </span>
              </header>

              <div className="mt-6 space-y-4 text-sm text-neutral-300">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/40 text-2xl">
                    {currentCompanion.emoji}
                  </span>
                  <div>
                    <p className="text-base font-semibold text-white">{currentCompanion.name}</p>
                    <p className="text-neutral-400">{currentCompanion.blurb}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-wider text-neutral-500">Current streak</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{streak?.current ?? 0} days</p>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-800">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  {upcomingCompanion ? (
                    <p className="mt-3 text-xs text-neutral-400">
                      {upcomingCompanion.emoji} Unlock {upcomingCompanion.name} at {upcomingCompanion.min} days.
                    </p>
                  ) : (
                    <p className="mt-3 text-xs text-neutral-400">Keep the ritual alive — you’ve met every companion we have.</p>
                  )}
                </div>

                <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-wider text-neutral-500">Longest run</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{streak?.longest ?? 0} days</p>
                  <p className="mt-2 text-xs text-neutral-400">
                    Your encrypted vault ensures only you can read your reflections.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </VaultGate>
    </div>
  );
}

// SECURITY WARNING: Never share your passphrase. If it is lost, we cannot recover your encrypted entries.
