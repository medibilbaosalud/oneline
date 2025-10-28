'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

const MAX = 333;

const QUOTES = [
  { t: 'Simplicity is the ultimate sophistication.', a: 'Leonardo da Vinci' },
  { t: 'Stay hungry, stay foolish.', a: 'Steve Jobs' },
  { t: 'The journey of a thousand miles begins with a single step.', a: 'Lao Tzu' },
  { t: 'How we spend our days is, of course, how we spend our lives.', a: 'Annie Dillard' },
  { t: 'No zero days. One line is enough.', a: 'OneLine' },
];

function quoteOfToday() {
  const key = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
  return QUOTES[key % QUOTES.length];
}

type SectionId = 'today' | 'history' | 'summaries' | 'settings';

type Section = {
  id: SectionId;
  label: string;
  blurb: string;
};

const SECTIONS: Section[] = [
  { id: 'today', label: 'Today', blurb: 'Write a 333-character reflection that encrypts before it leaves your browser.' },
  { id: 'history', label: 'History', blurb: 'See how past lines unlock locally with your passphrase—edits and deletions stay disabled here.' },
  { id: 'summaries', label: 'Summaries', blurb: 'Preview the consent flow that sends decrypted stories to Gemini only when you approve.' },
  { id: 'settings', label: 'Settings', blurb: 'Tour the account tools, streak insights, and encryption reminders in read-only form.' },
];

function SectionTabs({ active, onChange }: { active: SectionId; onChange: (id: SectionId) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {SECTIONS.map((section) => {
        const selected = section.id === active;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onChange(section.id)}
            className={
              selected
                ? 'rounded-full bg-gradient-to-r from-indigo-500/80 via-purple-500/80 to-emerald-400/80 px-4 py-2 text-white shadow-[0_10px_24px_rgba(79,70,229,0.25)] transition'
                : 'rounded-full border border-white/10 bg-white/5 px-4 py-2 text-neutral-200 transition hover:border-white/20 hover:bg-white/10'
            }
          >
            {section.label}
          </button>
        );
      })}
    </div>
  );
}

function TodayPreview() {
  const quote = useMemo(() => quoteOfToday(), []);
  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="flex min-h-[420px] flex-col rounded-2xl border border-white/10 bg-neutral-900/55 p-5 shadow-sm">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Today</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Demo entry (read-only)</h2>
          </div>
          <span className="inline-flex w-max rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-medium text-neutral-300">
            Locked
          </span>
        </header>

        <p className="mt-5 italic text-neutral-300">
          “{quote.t}” <span className="not-italic opacity-70">— {quote.a}</span>
        </p>

        <textarea
          value={'This is where your 333 characters go. Entries stay encrypted end to end until you unlock them with your passphrase.'}
          readOnly
          maxLength={MAX}
          className="mt-6 min-h-[220px] w-full flex-1 resize-none rounded-xl border border-white/5 bg-black/25 px-4 py-3 text-base leading-relaxed text-zinc-100 opacity-80 outline-none"
        />

        <div className="mt-6 flex flex-col gap-3 text-sm text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-medium text-neutral-400">118/{MAX}</span>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" disabled className="cursor-not-allowed rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-400">
              Clear
            </button>
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-lg bg-indigo-500/60 px-4 py-2 text-sm font-medium text-white/80"
            >
              Save entry
            </button>
          </div>
        </div>

        <p className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-200">
          To save for real, create an account, unlock your vault, and your browser will encrypt each line before anything touches our servers.
        </p>
      </div>

      <aside className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-neutral-900/55 p-5 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Momentum</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Streaks stay private too</h2>
          <p className="mt-3 text-sm leading-relaxed text-neutral-400">
            The real streak panel updates automatically based on your encrypted saves. Visitor mode keeps it frozen so you can see the layout without writing anything.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-neutral-300">
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Current streak</p>
          <p className="mt-2 text-3xl font-semibold text-white">0 days</p>
          <p className="mt-2 text-xs text-neutral-500">Unlock your vault and log consecutive days to watch this grow.</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-neutral-300">
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Companion</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-2xl">
              🦊
            </span>
            <div>
              <p className="text-base font-semibold text-white">Lumen the Fox</p>
              <p className="text-xs text-neutral-500">Appears at 7-day streaks to celebrate your start.</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-neutral-300">
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Ready to go?</p>
          <p className="mt-2 text-neutral-400">
            When you sign up you’ll create a permanent passphrase. Reuse the same code every time — if it changes, your previous entries stay locked forever.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/auth" className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400">
              Create account
            </Link>
            <Link href="/auth" className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:bg-white/10">
              Sign in
            </Link>
          </div>
        </div>
      </aside>
    </section>
  );
}

function HistoryPreview() {
  return (
    <section className="rounded-3xl border border-white/10 bg-neutral-900/40 p-6 shadow-xl">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">History</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Encrypted memories, unlocked by you</h2>
        </div>
        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-medium text-neutral-300">
          Read-only preview
        </span>
      </header>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-neutral-400">
        Every entry you save is encrypted client-side. When you revisit History, the browser unlocks each line with your passphrase and renders it here. Visitor mode keeps the entries static so you can see the layout without revealing personal data.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {[1, 2, 3].map((idx) => (
          <article key={idx} className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-neutral-500">
              <span>Tue, 14 Oct 2025</span>
              <span>Unlocked locally</span>
            </div>
            <p className="text-base leading-relaxed text-neutral-200">
              I wrote one honest line, celebrated a tiny win, and let the vault keep it safe. When I need the full story, I unlock it with the same passphrase.
            </p>
            <div className="mt-4 flex gap-2">
              <button className="cursor-not-allowed rounded-lg bg-neutral-800 px-3 py-1.5 text-sm text-neutral-400">Edit</button>
              <button className="cursor-not-allowed rounded-lg bg-neutral-800 px-3 py-1.5 text-sm text-neutral-400">Delete</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SummariesPreview() {
  return (
    <section className="rounded-3xl border border-white/10 bg-neutral-900/40 p-6 shadow-xl">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Summaries</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Consent-first storytelling</h2>
        </div>
        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-medium text-neutral-300">
          Read-only preview
        </span>
      </header>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-neutral-400">
        Generating a story requires your explicit consent. When you opt in, the app decrypts locally with your passphrase and sends the text to Gemini just for that request. Visitor mode shows the interface flow without ever touching real data.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-neutral-300">
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Consent modal</p>
          <p className="mt-2 leading-relaxed">
            The real modal explains the privacy trade-off, asks for your passphrase again, and won’t continue until you tick “I consent”.
          </p>
          <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-neutral-900/70 p-4">
            <div className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/20 text-xs text-white">1</span>
              <p className="text-neutral-200">Confirm consent and passphrase locally.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/20 text-xs text-white">2</span>
              <p className="text-neutral-200">Decrypt in-browser, send plain text once, and discard it.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/20 text-xs text-white">3</span>
              <p className="text-neutral-200">Receive your story and store only the ciphertext again.</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-neutral-300">
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Monthly quota</p>
          <p className="mt-2 leading-relaxed">
            The production app shows how many summaries remain (10 per month), refreshes after each run, and never sends data without consent.
          </p>
          <div className="mt-4 rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-4">
            <p className="text-sm font-medium text-white">Remaining summaries this month</p>
            <p className="mt-3 text-3xl font-semibold text-white">7 / 10</p>
            <div className="mt-3 h-2 rounded-full bg-white/10">
              <div className="h-full rounded-full bg-indigo-400" style={{ width: '70%' }} />
            </div>
            <p className="mt-3 text-xs text-neutral-300">Unlock the vault and keep your passphrase handy to generate your first story.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function SettingsPreview() {
  return (
    <section className="rounded-3xl border border-white/10 bg-neutral-900/40 p-6 shadow-xl">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Settings</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Command centre (visitor snapshot)</h2>
        </div>
        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-medium text-neutral-300">
          Read-only preview
        </span>
      </header>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-neutral-300">
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Session</p>
          <p className="mt-2 text-neutral-200">Visitors see placeholders; signed-in members see their email, Supabase session age, and vault status.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-neutral-300">
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Encryption</p>
          <p className="mt-2 text-neutral-200">We remind you that the original passphrase is required forever—lose it and the ciphertext is gone for good.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-neutral-300">
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Exports</p>
          <p className="mt-2 text-neutral-200">Exports stay encrypted unless you opt to decrypt locally first. Visitor mode keeps the buttons disabled.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-neutral-300">
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Danger zone</p>
          <p className="mt-2 text-neutral-200">Deleting the account wipes every ciphertext row. There is no server-side recovery because we never see your passphrase.</p>
        </div>
      </div>
    </section>
  );
}

function ActiveSection({ active }: { active: SectionId }) {
  switch (active) {
    case 'today':
      return <TodayPreview />;
    case 'history':
      return <HistoryPreview />;
    case 'summaries':
      return <SummariesPreview />;
    case 'settings':
      return <SettingsPreview />;
    default:
      return null;
  }
}

export default function VisitorExperience() {
  const [active, setActive] = useState<SectionId>('today');
  const [showInterface, setShowInterface] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (showInterface && shellRef.current) {
      shellRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showInterface]);

  const activeMeta = SECTIONS.find((section) => section.id === active);

  const handleReveal = () => {
    if (showInterface) {
      shellRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    setActive('today');
    setShowInterface(true);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07080B] text-zinc-100 selection:bg-indigo-600/30 selection:text-white">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-[12rem] top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.3),_transparent_65%)] blur-3xl" />
        <div className="absolute right-[-10rem] top-72 h-80 w-80 rounded-full bg-[radial-gradient(circle_at_bottom,_rgba(16,185,129,0.22),_transparent_60%)] blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#07080B] via-transparent to-transparent" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-6 py-16">
        <header className="max-w-3xl text-pretty text-center md:text-left">
          <p className="text-xs uppercase tracking-[0.28em] text-neutral-500">Visitor mode</p>
          <h1 className="mt-3 text-4xl font-semibold md:text-5xl">
            Walk through the OneLine workspace
          </h1>
          <p className="mt-4 text-sm text-neutral-400 md:text-base">
            Explore the editor, history, summaries, and settings without creating an account. Everything is read-only here — to save your own encrypted entries you’ll need to sign in and unlock your vault with a passphrase only you know.
          </p>
        </header>

        <div className="mt-10 flex flex-col items-center gap-4 text-center md:items-start md:text-left">
          <button
            type="button"
            onClick={handleReveal}
            className="group relative inline-flex items-center justify-center overflow-hidden rounded-full border border-white/20 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 px-9 py-4 text-base font-semibold text-white shadow-[0_18px_40px_rgba(79,70,229,0.45)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07080B] hover:shadow-[0_22px_48px_rgba(79,70,229,0.55)]"
          >
            <span className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
              <span className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.35),_transparent_70%)]" />
            </span>
            <span className="relative flex items-center gap-2 text-lg">
              <span className="text-xl">👀</span>
              Explore the workspace (no sign-in needed)
            </span>
          </button>
          <p className="max-w-xl text-sm text-neutral-400 md:text-base">
            Press the button to open a full, read-only replica of the Today, History, Summaries, and Settings pages — exactly how members see them, just with demo data and callouts.
          </p>
        </div>

        {showInterface ? (
          <div ref={shellRef} className="mt-16">
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/40 shadow-2xl shadow-black/40 backdrop-blur">
              <div className="border-b border-white/5 bg-black/40 px-6 py-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-left">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/20 text-xl">🦊</span>
                    <div>
                      <p className="text-sm font-semibold text-white">OneLine demo workspace</p>
                      <p className="text-xs text-neutral-500">All encryption-sensitive actions stay disabled here.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Visitor preview</span>
                    <span className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 md:inline">No login required</span>
                  </div>
                </div>
              </div>

              <div className="px-6 py-8">
                <SectionTabs active={active} onChange={setActive} />

                {activeMeta && (
                  <p className="mt-4 max-w-2xl text-sm text-neutral-400">{activeMeta.blurb}</p>
                )}

                <div className="mt-10 space-y-16">
                  <ActiveSection active={active} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-16 rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-neutral-400 backdrop-blur">
            Want to peek at the real interface? Press “Explore the workspace (no sign-in needed)” to launch an embedded tour that mirrors the production layout with explanations for every page.
          </div>
        )}
      </div>
    </main>
  );
}
