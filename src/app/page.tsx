// src/app/page.tsx
import Link from "next/link";

export const metadata = {
  title: "OneLine — One honest line a day",
  description:
    "Write up to 300 characters about your day, every day. Build a science-backed reflection habit and generate month, quarter, or year stories that read like you.",
};

export default function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07080B] text-zinc-100 selection:bg-indigo-600/30 selection:text-white">
      {/* AURORA / NEBULA BACKDROP */}
      <Aurora />

      {/* HERO */}
      <section className="relative mx-auto w-full max-w-6xl px-6 pt-16 md:pt-24">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <Badge>Private • 300 characters • Growth mindset</Badge>

          <h1 className="mt-4 bg-gradient-to-br from-white via-zinc-200 to-zinc-500 bg-clip-text text-4xl font-semibold leading-tight text-transparent md:text-6xl">
            One honest line a day.
            <span className="block bg-gradient-to-r from-emerald-300 to-indigo-400 bg-clip-text text-transparent">
              A tiny habit that compounds.
            </span>
          </h1>

          <div className="mt-6 grid w-full max-w-3xl gap-3 text-left text-sm text-zinc-300 sm:grid-cols-3 sm:text-base">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="font-medium text-white">Write in under a minute</p>
              <p className="mt-2 text-zinc-400">Capture up to 300 characters while the day is still vivid.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="font-medium text-white">Stay private, stay synced</p>
              <p className="mt-2 text-zinc-400">Entries live in the EU, sync across devices, and fuel your streak glow.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="font-medium text-white">See the story build</p>
              <p className="mt-2 text-zinc-400">Automatic recaps turn your lines into a narrative that sounds like you.</p>
            </div>
          </div>

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
            <Stat k="7s" v="Average time to write a line" />
            <Stat k="92%" v="Return the next week and stick with it" />
            <Stat k="0 ads" v="Your words stay private. Always." />
          </div>
        </div>
      </section>

      {/* METHOD EXPLAINER */}
      <section className="relative mx-auto mt-20 w-full max-w-6xl px-6 pb-16 md:mt-28 md:pb-20">
        <div className="grid items-start gap-10 md:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6 text-pretty text-base leading-relaxed text-zinc-300 md:text-lg">
            <h2 className="text-left text-2xl font-semibold text-white">Exactly how OneLine works</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <ExplainerCard
                title="Capture the signal"
                body="End each day in the Today screen with one true line. The 300-character cap keeps it sharp and easy to sustain."
              />
              <ExplainerCard
                title="Stitch the story"
                body="Entries are timestamped, tagged, and stored with EU-grade privacy. Summaries refresh monthly, quarterly, and every 1 January automatically."
              />
              <ExplainerCard
                title="See yourself clearly"
                body="OneLine becomes a living archive of your wins, lessons, and mindset shifts — ready for founder updates or personal check-ins."
              />
              <ExplainerCard
                title="Own your words"
                body="Export or delete anytime. You control your data; we simply help you build a habit that compounds."
              />
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-zinc-200 backdrop-blur md:mt-0">
            <h3 className="text-lg font-semibold text-white">Inside the daily loop</h3>
            <ul className="mt-4 space-y-3 text-left text-zinc-300">
              <li className="flex gap-3">
                <span className="mt-0.5 text-emerald-400">•</span>
                <span>
                  <strong>Reflect fast:</strong> Type 2–3 sentences, tag the mood if you want, hit
                  save.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 text-emerald-400">•</span>
                <span>
                  <strong>Stay accountable:</strong> See streaks, gentle nudges, and your most used
                  themes build over time.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 text-emerald-400">•</span>
                <span>
                  <strong>Unlock the story:</strong> Summaries refresh monthly, quarterly, and on
                  1 January automatically — ready to share or keep private.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* STREAK + COMPANIONS */}
      <section className="mx-auto mt-20 w-full max-w-6xl px-6 pb-16 md:mt-28 md:pb-20">
        <div className="grid items-center gap-12 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4 text-left text-pretty text-base leading-relaxed text-zinc-300 md:text-lg">
            <h2 className="text-2xl font-semibold text-white">Keep your streak — unlock your companion</h2>
            <p>Consistency matters more than word count. OneLine keeps the daily ritual friendly so you can show up again tomorrow.</p>
            <ul className="space-y-3 text-sm leading-relaxed text-zinc-400 md:text-base">
              <li className="flex gap-3">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span><strong>See the streak glow:</strong> Celebrate consecutive days without anxiety — miss once and you start fresh, no shaming.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-400" />
                <span><strong>Meet your guide:</strong> A digital companion evolves as you log more days, mirroring your growth mindset.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
                <span><strong>Unlock rewards:</strong> New companions and ambient themes appear at 7, 21, 60, and 120-day streaks.</span>
              </li>
            </ul>
          </div>
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-6 text-sm text-zinc-200 shadow-2xl shadow-indigo-500/10 backdrop-blur">
            <div className="absolute -inset-24 -z-10 rounded-full bg-[radial-gradient(circle_at_top,rgba(129,140,248,0.22),transparent_55%)]" />
            <header className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.24em] text-indigo-200/80">Today’s momentum</span>
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-medium text-white/80">Syncs across devices</span>
            </header>
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-5">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Current streak</span>
                <span>Longest</span>
              </div>
              <div className="mt-2 flex items-end justify-between">
                <div>
                  <div className="text-4xl font-semibold text-white">12<span className="text-lg text-zinc-500"> days</span></div>
                  <p className="mt-1 text-xs text-zinc-400">Next badge at 21 days</p>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-emerald-300">41 days</div>
              </div>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full w-[57%] rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-indigo-500" />
              </div>
            </div>
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Companion</p>
                  <p className="mt-1 text-lg font-semibold text-white">Lumen the Fox</p>
                </div>
                <span className="text-3xl">🦊</span>
              </div>
              <p className="mt-3 text-xs text-zinc-400">Unlocked at 7 days. Keep logging to evolve your guide and reveal new environments.</p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center text-[11px] text-zinc-400">
                <CompanionBadge icon="🦊" label="Lumen" unlocked />
                <CompanionBadge icon="🦉" label="Atlas" unlocked={false} />
                <CompanionBadge icon="🐋" label="Nami" unlocked={false} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section id="benefits" className="mx-auto w-full max-w-6xl px-6 py-16 md:py-20">
        <div className="grid gap-5 md:grid-cols-3">
          <FeatureCard
            title="Designed for daily momentum"
            desc="Micro-entries under 300 characters keep you honest without draining your energy. Every pixel is tuned to get you in and out in under ten seconds."
            emoji="🧭"
          />
          <FeatureCard
            title="Private by architecture"
            desc="Your journal never fuels ads or models. Export, delete, or automate yearly recaps whenever you want — your data stays under your control."
            emoji="🔒"
          />
          <FeatureCard
            title="Narratives that feel like you"
            desc="Generate a month, quarter, or year in review — plus the automatic New Year recap — with tone, voice, and highlights tuned to your entries."
            emoji="✨"
          />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-16 md:pb-20">
        <div className="grid gap-5 md:grid-cols-3">
          <StepCard n="01" title="Week one">
            Feel the relief of closing each day with one honest, sub-300-character reflection. The streak builds momentum, not pressure.
          </StepCard>
          <StepCard n="02" title="Day 30">
            Patterns surface. You spot repeatable wins, mindset shifts, and friction before they snowball.
          </StepCard>
          <StepCard n="03" title="Quarter’s end">
            One click — or the automatic 1 January generation — gives you a founder update, performance recap, or personal story that sounds like you wrote it.
          </StepCard>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="mx-auto w-full max-w-6xl px-6 pb-16 md:pb-20">
        <h2 className="mb-6 text-xl font-semibold text-zinc-200">How OneLine fits your day</h2>
        <div className="grid gap-5 md:grid-cols-3">
          <StepCard n="1" title="Write under 300 characters">
            Open <b>Today</b> and capture the highlight, tension, or lesson in two short sentences. Five to ten seconds is all you need.
          </StepCard>
          <StepCard n="2" title="Keep the streak (and grow)">
            Tomorrow, do it again. The constraint builds growth-mindset reflection: what worked, what changed, what to try next.
          </StepCard>
          <StepCard n="3" title="Generate a story">
            When you want perspective, create a summary for the last month,
            quarter or year — or let OneLine produce your year-in-review the moment January arrives. Clean, faithful, readable.
          </StepCard>
        </div>
      </section>

      {/* SCIENCE */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-16 md:pb-24">
        <div className="grid gap-8 rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-8 backdrop-blur md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h2 className="text-2xl font-semibold text-white">Why the science backs micro-journaling</h2>
            <p className="mt-4 text-pretty text-base leading-relaxed text-zinc-300 md:text-lg">
              OneLine stands on decades of behavioural research. Keeping the ritual short means
              you actually do it; weaving stories from your own words gives you insight without the
              blank-page anxiety.
            </p>
          </div>
          <ul className="space-y-4 text-sm leading-relaxed text-zinc-300">
            <li className="rounded-xl border border-white/10 bg-black/20 p-4">
              <strong>Expressive writing boosts wellbeing.</strong> Dr. James Pennebaker’s studies
              show that brief, honest reflection improves immune function and emotional processing.
              OneLine’s daily constraint mirrors that proven cadence.
            </li>
            <li className="rounded-xl border border-white/10 bg-black/20 p-4">
              <strong>Gratitude + growth mindsets compound.</strong> Research from Emmons &
              McCullough and Carol Dweck links consistent gratitude and growth-focused journaling
              to higher resilience, motivation, and long-term goal attainment.
            </li>
            <li className="rounded-xl border border-white/10 bg-black/20 p-4">
              <strong>Reviewing wins fuels performance.</strong> Harvard Business School findings on
              the “progress principle” show that documenting small wins increases engagement and
              creativity. Your automatic stories spotlight those wins for you.
            </li>
          </ul>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-16 md:pb-24">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <blockquote className="text-lg text-zinc-300">
            “My founders’ updates used to take a Sunday afternoon. Now I write one line a day, click generate, and the story
            sounds like me — detailed, not fluffy.”
          </blockquote>
          <div className="mt-3 text-sm text-zinc-400">— Elena, product lead & OneLine early adopter</div>
        </div>
      </section>

      {/* PRIVACY */}
      <section id="privacy" className="mx-auto w-full max-w-6xl px-6 pb-20">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/50 to-zinc-900/10 p-6">
          <h3 className="text-lg font-semibold text-zinc-200">Built for discretion</h3>
          <p className="mt-2 text-zinc-400">
            We operate from Madrid under EU privacy law and give you full control over your words. Automations run with your
            permission, exports are instant, and deletion is irreversible — exactly as it should be.
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

function ExplainerCard({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{body}</p>
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

function CompanionBadge({
  icon,
  label,
  unlocked,
}: {
  icon: string;
  label: string;
  unlocked: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-1 rounded-xl border border-white/10 px-3 py-2 ${
        unlocked ? "bg-white/10 text-zinc-200" : "bg-black/20 text-zinc-500"
      }`}
    >
      <span className="text-2xl">{unlocked ? icon : "🔒"}</span>
      <span className="text-[11px] font-medium tracking-wide uppercase">{label}</span>
      <span className="text-[10px] text-zinc-500">
        {unlocked ? "Active" : "Locked"}
      </span>
    </div>
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