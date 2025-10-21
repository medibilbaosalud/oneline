'use client';

import { useMemo, useState } from 'react';
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
                ? 'rounded-full bg-white/15 px-4 py-2 text-white shadow-lg shadow-indigo-500/20 transition'
                : 'rounded-full border border-white/10 bg-white/5 px-4 py-2 text-neutral-200 transition hover:bg-white/10'
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
    <section className="grid gap-8 md:grid-cols-[1.05fr_0.95fr]">
      <div className="flex flex-col rounded-3xl border border-white/10 bg-neutral-900/40 p-6 shadow-xl">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Today</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Demo entry (read-only)</h2>
          </div>
          <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-medium text-neutral-300">
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
          className="mt-6 min-h-[220px] flex-1 resize-none rounded-xl border border-white/5 bg-black/30 px-4 py-3 text-base leading-relaxed text-zinc-100 opacity-70 outline-none"
        />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-neutral-500">
          <span>118/{MAX}</span>
          <div className="flex gap-2">
            <button type="button" disabled className="cursor-not-allowed rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-400">
              Clear
            </button>
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-lg bg-indigo-500/60 px-4 py-2 text-sm font-medium text-white/70"
            >
              Save entry
            </button>
          </div>
        </div>

        <p className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-200">
          To save for real, create an account, unlock your vault, and your browser will encrypt each line before anything touches our servers.
        </p>
      </div>

      <aside className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-neutral-900/40 p-6 shadow-xl">
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

  const activeMeta = SECTIONS.find((section) => section.id === active);

  return (
    <main className="min-h-screen bg-[#07080B] text-zinc-100">
      <div className="mx-auto w-full max-w-6xl px-6 py-16">
        <header className="mb-10 max-w-3xl text-pretty text-center md:text-left">
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Visitor mode</p>
          <h1 className="mt-3 text-4xl font-semibold md:text-5xl">Walk through the OneLine workspace</h1>
          <p className="mt-4 text-sm text-neutral-400 md:text-base">
            Explore the editor, history, summaries, and settings without creating an account. Everything is read-only here — to save your own encrypted entries you’ll need to sign in and unlock your vault with a passphrase only you know.
          </p>
        </header>

        <SectionTabs active={active} onChange={setActive} />

        {activeMeta && (
          <p className="mt-4 max-w-2xl text-sm text-neutral-400">{activeMeta.blurb}</p>
        )}

        <div className="mt-10 space-y-16">
          <ActiveSection active={active} />
        </div>
      </div>
    </main>
  );
}
