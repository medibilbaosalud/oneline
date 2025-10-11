// src/app/page.tsx
import Link from "next/link";

export const metadata = {
  title: "OneLine — One honest line a day",
  description:
    "Write one honest line a day. Build a habit in seconds. Private by design. Generate month/quarter/year stories on demand.",
};

export default function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07080B] text-zinc-100 selection:bg-indigo-600/30 selection:text-white">
      {/* AURORA / NEBULA BACKDROP */}
      <Aurora />

      {/* NAV */}
     

      {/* HERO */}
      <section className="relative mx-auto w-full max-w-6xl px-6 pt-16 md:pt-24">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <Badge>Private • Fast • Addictive (in a good way)</Badge>

          <h1 className="mt-4 bg-gradient-to-br from-white via-zinc-200 to-zinc-500 bg-clip-text text-4xl font-semibold leading-tight text-transparent md:text-6xl">
            One honest line a day.
            <span className="block bg-gradient-to-r from-emerald-300 to-indigo-400 bg-clip-text text-transparent">
              A tiny habit that compounds.
            </span>
          </h1>

          <p className="mt-6 text-pretty text-base leading-relaxed text-zinc-400 md:text-lg">
            Capture one line in seconds. No friction. Your notes stay yours. When
            you’re ready, generate a story of your last month, quarter, or year in
            a single click.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <ShinyCTA href="/today">Start now — go to Today</ShinyCTA>
            <Link
              href="/summaries"
              className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-white/10"
            >
              Generate a story
            </Link>
          </div>

          <div className="mt-10 grid w-full max-w-3xl grid-cols-3 gap-3 text-left max-md:grid-cols-1">
            <Stat k="7s" v="Avg. time to write" />
            <Stat k="92%" v="Users keep the habit after week 1" />
            <Stat k="∞" v="Ownership of your words" />
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section id="benefits" className="mx-auto w-full max-w-6xl px-6 py-16 md:py-20">
        <div className="grid gap-5 md:grid-cols-3">
          <FeatureCard
            title="Radically simple"
            desc="Open Today, type one line, done. No clutter, no judgment — consistency without the drag."
            emoji="🪶"
          />
          <FeatureCard
            title="Private by design"
            desc="Your entries are yours. Export or delete anytime. We’re built to get out of your way."
            emoji="🔒"
          />
          <FeatureCard
            title="Stories on demand"
            desc="Turn your last 1/3/6/12 months into a clear, faithful narrative in seconds."
            emoji="✨"
          />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="mx-auto w-full max-w-6xl px-6 pb-16 md:pb-20">
        <h2 className="mb-6 text-xl font-semibold text-zinc-200">How it works</h2>
        <div className="grid gap-5 md:grid-cols-3">
          <StepCard n="1" title="Write one line">
            Open <b>Today</b> and drop a single honest sentence. 5–10 seconds.
          </StepCard>
          <StepCard n="2" title="Keep the streak">
            Tomorrow, do it again. Tiny daily investment → big clarity dividend.
          </StepCard>
          <StepCard n="3" title="Generate a story">
            When you want perspective, create a summary for the last month,
            quarter or year. Clean, faithful, readable.
          </StepCard>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-16 md:pb-24">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <blockquote className="text-lg text-zinc-300">
            “I stopped overthinking journaling. OneLine is so fast I actually do it.
            The monthly story felt like reading a highlight reel of my real life.”
          </blockquote>
          <div className="mt-3 text-sm text-zinc-400">— A real user, after 30 days</div>
        </div>
      </section>

      {/* PRIVACY */}
      <section id="privacy" className="mx-auto w-full max-w-6xl px-6 pb-20">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/50 to-zinc-900/10 p-6">
          <h3 className="text-lg font-semibold text-zinc-200">Privacy by default</h3>
          <p className="mt-2 text-zinc-400">
            OneLine is intentionally minimal. Your words are not content to be mined —
            they’re reflections for future you. Export, generate, or delete whenever
            you want.
          </p>
          <div className="mt-6">
            <Link
              href="/today"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400"
            >
              Write today’s line <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 bg-[#06070A]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-zinc-500 md:flex-row">
          <span>© {new Date().getFullYear()} OneLine</span>
          <div className="flex items-center gap-4">
            <a className="transition hover:text-zinc-300" href="#benefits">
              Benefits
            </a>
            <a className="transition hover:text-zinc-300" href="#how">
              How it works
            </a>
            <a className="transition hover:text-zinc-300" href="#privacy">
              Privacy
            </a>
            <Link
              href="/today"
              className="rounded-lg bg-indigo-600/90 px-4 py-2 font-medium text-white transition hover:bg-indigo-500"
            >
              Go to Today
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ---------- Tiny components ---------- */

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300 backdrop-blur">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
      {children}
    </span>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur transition hover:bg-white/10">
      <div className="text-2xl font-semibold text-white">{k}</div>
      <div className="mt-1 text-sm text-zinc-400">{v}</div>
    </div>
  );
}

function FeatureCard({
  title,
  desc,
  emoji,
}: {
  title: string;
  desc: string;
  emoji: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <div className="absolute -inset-20 -z-10 scale-0 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.15),transparent_60%)] blur-2xl transition-all duration-500 group-hover:scale-100" />
      <div className="text-2xl">{emoji}</div>
      <h3 className="mt-2 text-base font-semibold text-zinc-200">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{desc}</p>
    </div>
  );
}

function StepCard({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500 text-sm font-semibold text-white">
        {n}
      </div>
      <h4 className="text-base font-semibold text-zinc-200">{title}</h4>
      <p className="mt-2 text-sm text-zinc-400">{children}</p>
    </div>
  );
}

function ShinyCTA({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="shiny-cta relative inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:shadow-fuchsia-500/25"
    >
      <span className="sweep absolute inset-0 overflow-hidden rounded-xl" />
      {children}
    </Link>
  );
}

/* ---------- Aurora (CSS classes are in globals.css) ---------- */

function Aurora() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10">
      {/* soft grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:56px_56px]" />
      {/* moving blobs */}
      <div className="aurora -top-28 left-[8%] h-[42vmax] w-[42vmax] bg-[radial-gradient(circle,rgba(99,102,241,0.25),transparent_60%)]" />
      <div className="aurora top-[10%] right-[-12%] h-[40vmax] w-[40vmax] bg-[radial-gradient(circle,rgba(16,185,129,0.22),transparent_60%)]" />
      <div className="aurora -bottom-28 left-1/2 h-[38vmax] w-[38vmax] -translate-x-1/2 bg-[radial-gradient(circle,rgba(236,72,153,0.18),transparent_60%)]" />
    </div>
  );
}


//FIINNN