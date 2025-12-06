import Link from "next/link";

export const dynamic = 'force-dynamic';

export default function HowToUsePage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="relative isolate overflow-hidden bg-gradient-to-b from-neutral-900 via-neutral-950 to-black">
        <div className="mx-auto max-w-5xl px-6 pb-16 pt-14 md:pt-16">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/80">How to use OneLine</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">A tiny ritual that keeps your story clear</h1>
          <p className="mt-4 max-w-2xl text-lg text-zinc-300">
            Write one encrypted line each day in the language that feels natural to you. OneLine stays light, private, and
            consistent so you can remember what mattered without adding another chore.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-zinc-300">
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">No credit card required</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Client-side encryption</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Summaries stay in your voice</span>
          </div>
          <div className="mt-8 flex gap-3">
            <Link
              href="/today"
              className="rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-black shadow-lg shadow-emerald-400/40 transition hover:-translate-y-[1px] hover:shadow-emerald-300/50"
            >
              Start today&apos;s line
            </Link>
            <Link
              href="/summaries"
              className="rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:border-white/30"
            >
              See your summaries
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-14">
        <div className="grid gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-6 shadow-[0_20px_80px_-60px_rgba(0,0,0,0.9)] md:grid-cols-3">
          {[{
            title: "Set your vault", body: "Create your account, choose a passphrase, and unlock your private vault. Only you know it—there is no recovery."
          },
          { title: "Capture one line", body: "Type up to 333 characters in any language. A couple of sentences or a few bullets are enough to capture the day." },
          { title: "See the patterns", body: "Check your streaks, weekly stories, and longer summaries. They stay in your voice and respect your mix of languages." },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-white/5 bg-white/[0.03] p-4 shadow-[0_10px_50px_-45px_rgba(0,0,0,0.9)]">
              <h3 className="text-base font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-6 shadow-[0_18px_70px_-60px_rgba(16,185,129,0.7)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200/80">Daily rhythm</p>
          <h2 className="mt-2 text-2xl font-semibold">Your 60-second nightly loop</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <h3 className="text-sm font-semibold text-white">1) Open the vault</h3>
              <p className="mt-2 text-sm text-zinc-300">Unlock with your passphrase. The app stays empty until you are authenticated and the vault is open.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <h3 className="text-sm font-semibold text-white">2) Write one truthful line</h3>
              <p className="mt-2 text-sm text-zinc-300">Note what mattered—good, bad, or neutral. Feel free to mix languages; summaries keep your wording.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <h3 className="text-sm font-semibold text-white">3) Track your streak</h3>
              <p className="mt-2 text-sm text-zinc-300">Fill gaps when you remember them and watch your streak adjust instantly. No pressure for perfection.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <h3 className="text-sm font-semibold text-white">4) Unlock stories when ready</h3>
              <p className="mt-2 text-sm text-zinc-300">After a few entries, generate weekly stories; longer spans adapt length automatically. Export anything whenever you like.</p>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-6 rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200/80">Privacy and control</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Your words stay yours</h3>
            <ul className="mt-3 space-y-2 text-sm text-zinc-300">
              <li className="flex gap-2"><span className="mt-[6px] h-[10px] w-[10px] rounded-full bg-emerald-400/80" aria-hidden />Client-side encryption keeps entries private to your passphrase.</li>
              <li className="flex gap-2"><span className="mt-[6px] h-[10px] w-[10px] rounded-full bg-emerald-400/80" aria-hidden />No recovery keys—store your passphrase safely; we cannot reset it.</li>
              <li className="flex gap-2"><span className="mt-[6px] h-[10px] w-[10px] rounded-full bg-emerald-400/80" aria-hidden />Export whenever you want: raw entries, summaries, and stories stay portable.</li>
              <li className="flex gap-2"><span className="mt-[6px] h-[10px] w-[10px] rounded-full bg-emerald-400/80" aria-hidden />Language-safe prompts keep your mix of words intact without translation.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/40 p-5 shadow-[0_16px_60px_-55px_rgba(0,0,0,0.9)]">
            <h4 className="text-sm font-semibold text-white">Quick tips</h4>
            <ul className="mt-3 space-y-2 text-sm text-zinc-300">
              <li><strong className="text-white">Keep it tiny.</strong> Two to three sentences are enough to anchor the day.</li>
              <li><strong className="text-white">Capture feelings and facts.</strong> Mention what happened and how you felt.</li>
              <li><strong className="text-white">Use your own language.</strong> Write in English, Spanish, or any mix; OneLine mirrors it.</li>
              <li><strong className="text-white">Review weekly.</strong> When the app offers a story, read it and add your notes.</li>
            </ul>
            <div className="mt-5 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              Ready to dive in? Start with tonight&apos;s line—if you forget, you can backfill and your streak will catch up.
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-3">
          <Link
            href="/today"
            className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black shadow-lg shadow-white/30 transition hover:-translate-y-[1px]"
          >
            Write now
          </Link>
          <Link
            href="/history"
            className="rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:border-white/30"
          >
            Browse your timeline
          </Link>
          <p className="text-sm text-zinc-400">Encrypted by default. No credit card. Export anytime.</p>
        </div>
      </div>
    </main>
  );
}
