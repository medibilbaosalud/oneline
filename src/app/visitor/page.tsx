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

        <nav className="mb-12 flex flex-wrap gap-3 text-sm">
          <a
            href="#today"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-neutral-200 transition hover:bg-white/10"
          >
            Today demo
          </a>
          <a
            href="#history"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-neutral-200 transition hover:bg-white/10"
          >
            History tour
          </a>
          <a
            href="#summaries"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-neutral-200 transition hover:bg-white/10"
          >
            Summaries preview
          </a>
          <a
            href="#settings"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-neutral-200 transition hover:bg-white/10"
          >
            Settings glimpse
          </a>
        </nav>

        <section id="today" className="grid gap-8 md:grid-cols-[1.05fr_0.95fr]">
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
        </section>

        <section id="history" className="mt-16 rounded-3xl border border-white/10 bg-neutral-900/40 p-6 shadow-xl">
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

        <section id="summaries" className="mt-16 rounded-3xl border border-white/10 bg-neutral-900/40 p-6 shadow-xl">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Summaries</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Consent-first storytelling</h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-medium text-neutral-300">
              Read-only preview
            </span>
          </header>
          <div className="mt-4 grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
            <p className="text-sm leading-relaxed text-neutral-400">
              When you generate a story we decrypt entries locally, ask for your consent, and send plain text only to Gemini for that single request. Visitor mode demonstrates the flow and messaging without sending anything.
            </p>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              <p className="font-medium">Security reminder</p>
              <p className="mt-2 text-emerald-100/80">
                Your passphrase never leaves your browser. Decline consent and nothing leaves the encrypted vault.
              </p>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-neutral-300">
            <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Preview</p>
            <p className="mt-3 text-neutral-200">
              “A year narrated in your own words. Visitor mode keeps the story placeholder locked until you create an account and unlock your vault.”
            </p>
            <button className="mt-4 cursor-not-allowed rounded-lg bg-indigo-500/60 px-4 py-2 text-sm font-medium text-white/70">
              Generate story (disabled)
            </button>
          </div>
        </section>

        <section id="settings" className="mt-16 rounded-3xl border border-white/10 bg-neutral-900/40 p-6 shadow-xl">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Settings</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Control without compromise</h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-medium text-neutral-300">
              Read-only preview
            </span>
          </header>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-neutral-300">
              <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Vault status</p>
              <p className="mt-2 text-neutral-200">Locked until you enter the same passphrase you chose on day one.</p>
              <p className="mt-2 text-xs text-neutral-500">Forget it and the encrypted entries stay sealed forever.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-neutral-300">
              <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Exports</p>
              <p className="mt-2 text-neutral-200">Download a decrypted copy after unlocking. Visitor mode keeps buttons disabled.</p>
              <div className="mt-3 flex gap-2">
                <button className="cursor-not-allowed rounded-lg bg-neutral-800 px-3 py-1.5 text-sm text-neutral-400">Export</button>
                <button className="cursor-not-allowed rounded-lg bg-neutral-800 px-3 py-1.5 text-sm text-neutral-400">Delete account</button>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-neutral-300">
              <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Summary cadence</p>
              <p className="mt-2 text-neutral-200">Switch between monthly, quarterly, or yearly recaps once you&rsquo;re signed in.</p>
              <p className="mt-2 text-xs text-neutral-500">All settings persist on the encrypted profile.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-neutral-300">
              <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Need help?</p>
              <p className="mt-2 text-neutral-200">Reach us at oneline.developerteam@gmail.com. We can help if you need guidance—just remember we can&rsquo;t recover lost passphrases.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
