// src/app/visitor/page.tsx
import Link from 'next/link';

const MAX = 300;

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

export const metadata = {
  title: 'Visitor mode — OneLine',
  description: 'Preview the OneLine interface in read-only mode before creating your encrypted account.',
};

export default function VisitorPage() {
  const quote = quoteOfToday();
  return (
    <main className="min-h-screen bg-[#07080B] text-zinc-100">
      <div className="mx-auto w-full max-w-6xl px-6 py-16">
        <header className="mb-10 max-w-3xl text-pretty text-center md:text-left">
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Visitor mode</p>
          <h1 className="mt-3 text-4xl font-semibold md:text-5xl">Walk through the OneLine workspace</h1>
          <p className="mt-4 text-sm text-neutral-400 md:text-base">
            Explore the editor, streaks, and summaries without creating an account. Everything is read-only here — to save your own encrypted entries you&rsquo;ll need to sign in and unlock your vault with a passphrase only you know.
          </p>
        </header>

        <div className="grid gap-8 md:grid-cols-[1.05fr_0.95fr]">
          <section className="flex flex-col rounded-3xl border border-white/10 bg-neutral-900/40 p-6 shadow-xl">
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
              value={'This is where your 300 characters go. Entries stay encrypted end to end until you unlock them with your passphrase.'}
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
          </section>

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
                When you sign up you&rsquo;ll create a permanent passphrase. Reuse the same code every time — if it changes, your previous entries stay locked forever.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/auth"
                  className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
                >
                  Create account
                </Link>
                <Link
                  href="/auth"
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:bg-white/10"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
