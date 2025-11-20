// src/app/page.tsx
import Link from "next/link";
import type { Metadata } from "next";

import { SignupFeedbackBanner } from "@/components/SignupFeedbackBanner";
import { LandingOnboardingSection } from "@/components/LandingOnboardingSection";

export const metadata: Metadata = {
  title: "OneLine — One honest line a day",
  description:
    "Write up to 333 characters about your day, encrypted end to end by a passphrase only you know. Build a science-backed reflection habit and generate stories that read like you.",
};

type LandingProps = {
  searchParams?: {
    signup?: string;
  };
};

export default function Landing({ searchParams }: LandingProps) {
  const signupStatus = searchParams?.signup as "ok" | "error" | "missing" | undefined;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07080B] text-zinc-100 selection:bg-indigo-600/30 selection:text-white">
      {signupStatus ? (
        <div className="relative mx-auto w-full max-w-5xl px-6 pt-6">
          <SignupFeedbackBanner status={signupStatus} />
        </div>
      ) : null}

      <Aurora />

      <section className="relative mx-auto w-full max-w-6xl px-6 pt-16 md:pt-24">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <Badge>Private • 333 characters • Daily momentum</Badge>

          <h1 className="mt-4 bg-gradient-to-br from-white via-zinc-200 to-zinc-500 bg-clip-text text-4xl font-semibold leading-tight text-transparent md:text-6xl">
            One honest line a day.
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-lg text-zinc-300">
            Capture a single, encrypted line in under a minute. OneLine keeps it private, turns it into science-backed reflection, and helps you notice the patterns that change you.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <ShinyCTA href="/today">
              <span className="flex flex-col items-center leading-tight">
                <span>Start now</span>
                <span className="text-xs font-normal text-white/80">No credit card. Encrypted by default.</span>
              </span>
            </ShinyCTA>
            <Link
              href="/encryption"
              className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-white/10"
            >
              See how encryption works
            </Link>
            <Link
              href="/visitor"
              className="rounded-xl bg-gradient-to-r from-indigo-500/70 via-purple-500/70 to-emerald-500/70 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:from-indigo-400 hover:via-purple-400 hover:to-emerald-400"
            >
              Explore visitor mode
            </Link>
          </div>

          <div className="mt-10 grid w-full max-w-3xl grid-cols-1 gap-3 text-left md:grid-cols-3">
            <Stat k="7s" v="Average time to write a line" />
            <Stat k="92%" v="Return the next week and keep going" />
            <Stat k="0 ads" v="Your words stay private. Always." />
          </div>
        </div>
      </section>

      <section id="benefits" className="relative mx-auto mt-14 w-full max-w-6xl px-6 md:mt-20">
        <div className="grid gap-5 md:grid-cols-3">
          <FeatureCard
            title="Write fast"
            desc="333 characters max means two or three sentences — enough to remember, never enough to stall."
            emoji="⏱️"
          />
          <FeatureCard
            title="Encrypted by default"
            desc="Your passphrase derives the key locally; servers only see ciphertext."
            emoji="🔒"
          />
          <FeatureCard
            title="Stories that sound like you"
            desc="Generate monthly, quarterly, or yearly recaps without rewriting. Tone and highlights stay faithful to your words."
            emoji="📖"
          />
        </div>
      </section>

      <section className="relative mx-auto mt-16 w-full max-w-6xl px-6 md:mt-20">
        <div className="space-y-8 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-indigo-500/10 backdrop-blur">
          <div className="space-y-2 text-center md:text-left">
            <h2 className="text-3xl font-semibold text-white md:text-4xl">Why OneLine matters now</h2>
            <p className="text-base text-zinc-300 md:text-lg">
              Your brain wasn’t built for endless feeds, scattered notes, and 20-minute journaling sessions. OneLine gives you a tiny daily pause that actually fits your life.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <FeatureCard
              title="Life blurs together"
              desc="Most days disappear in a scroll of notifications. Without a simple way to capture what mattered, weeks feel the same and it’s hard to see your own story."
              emoji="🌫️"
            />
            <FeatureCard
              title="Your brain is biased"
              desc="We remember stressful or odd moments more than the quiet wins. That makes you feel stuck, even when you’re actually growing."
              emoji="🧠"
            />
            <FeatureCard
              title="You need something tiny"
              desc="Big journaling apps feel like another task. OneLine asks for just 333 characters — two or three sentences — so you can keep the habit even on rough days."
              emoji="✨"
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
            <div className="space-y-3">
              <div className="space-y-1">
                <h3 className="text-2xl font-semibold text-white">What changes when you write one line a day</h3>
                <p className="text-sm text-zinc-300 md:text-base">
                  In 30–60 seconds a night, you quietly train attention, memory, and self-awareness. Over a few weeks, that compounds into real change:
                </p>
              </div>
              <ul className="space-y-2 text-sm text-zinc-200 md:text-base">
                <li className="flex gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />You notice small wins instead of only problems.</li>
                <li className="flex gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-indigo-400" />You remember what actually happened, not just how you felt in the worst moment.</li>
                <li className="flex gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-fuchsia-400" />You see patterns in your mood, energy, and choices.</li>
                <li className="flex gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-cyan-400" />You have a written record when you need to make decisions about work, relationships, or health.</li>
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-400/30 bg-indigo-500/10 p-6 shadow-[0_18px_60px_rgba(79,70,229,0.25)]">
            <div className="space-y-2">
              <h3 className="text-2xl font-semibold text-white">Built on a method your brain already likes</h3>
              <p className="text-sm text-zinc-200 md:text-base">
                OneLine is designed around <strong>Tiny Habits + expressive writing</strong>, two approaches with decades of research behind them:
              </p>
            </div>
            <div className="mt-4 space-y-3 text-sm text-zinc-100 md:text-base">
              <p><strong>Tiny Habits framework.</strong> Stanford behavior scientist BJ Fogg showed that tiny, 30-second actions attached to an existing routine are far more likely to stick than ambitious goals. OneLine turns reflection into one tiny habit before bed or after brushing your teeth.</p>
              <p><strong>Expressive & positive journaling.</strong> Studies on expressive writing and brief online journaling have found improvements in mood, stress, resilience, and even physical health when people regularly write about their thoughts and feelings.</p>
              <p><strong>Gratitude-style highlights.</strong> Simple practices where you record a few good moments each day can increase happiness and reduce depressive symptoms. OneLine’s 333-character limit captures those highlights without pressure.</p>
              <p className="text-zinc-300">OneLine doesn’t promise therapy or miracles — it gives you a tiny, science-informed ritual you can keep, so the benefits compound over time.</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 text-center md:flex-row md:justify-between md:text-left">
            <div className="text-sm text-zinc-300 md:text-base">
              Start your first line tonight — it’s free, takes under 30 seconds, and you can export everything anytime. No credit card. Encrypted by default.
            </div>
            <ShinyCTA href="/today">
              <span className="flex flex-col items-center leading-tight">
                <span>Start writing now</span>
                <span className="text-xs font-normal text-white/80">No credit card. Encrypted by default.</span>
              </span>
            </ShinyCTA>
          </div>
        </div>
      </section>

      <section className="relative mx-auto mt-16 w-full max-w-6xl px-6 md:mt-20">
        <div className="grid gap-8 rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-6 backdrop-blur md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4 text-pretty text-base leading-relaxed text-zinc-300 md:text-lg">
            <h2 className="text-left text-2xl font-semibold text-white">Privacy that actually holds</h2>
            <p className="text-zinc-300">Everything happens client-side: key derivation, encryption, and unlock. We never see your passphrase or plaintext.</p>
            <ul className="space-y-3 text-sm leading-relaxed text-zinc-200 md:text-base">
              <li className="flex gap-3">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span><strong>End-to-end by default.</strong> AES-GCM before anything touches Supabase.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-400" />
                <span><strong>Passphrase = key.</strong> Lose it and the vault stays sealed; we cannot reset it.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
                <span><strong>Your data, your terms.</strong> Export or delete anytime without requests or support tickets.</span>
              </li>
            </ul>
            <Link
              href="/encryption"
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-indigo-400/40 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_40px_rgba(79,70,229,0.25)] transition hover:border-indigo-300/50 hover:bg-indigo-500/20"
            >
              Learn how the vault works <span aria-hidden>→</span>
            </Link>
          </div>
          <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-5 text-left text-sm leading-relaxed text-zinc-200 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <h3 className="text-lg font-semibold text-white">Built to change you</h3>
            <ul className="space-y-3 text-zinc-300">
              <li className="flex gap-3">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-400" />
                <span><strong>Daily micro-reflection.</strong> Neuroscience shows short, consistent check-ins reduce stress and sharpen recall.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span><strong>Identity-first habit.</strong> 333 characters train you to notice who you are becoming, not just what you did.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
                <span><strong>Stories powered by your words.</strong> Recaps keep your tone and highlight the growth you care about.</span>
              </li>
            </ul>
            <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-zinc-200">
              <p className="text-xs uppercase tracking-[0.24em] text-indigo-200/80">No recovery</p>
              <p className="mt-2 text-sm text-zinc-300">True privacy means we cannot unlock for you—protect your passphrase.</p>
            </div>
          </div>
        </div>
      </section>

      <LandingOnboardingSection />

      <section id="how" className="mx-auto mt-16 w-full max-w-6xl px-6 pb-16 md:mt-24 md:pb-20">
        <div className="grid gap-5 md:grid-cols-3">
          <StepCard n="1" title="End the day with one line">Two or three sentences that fit inside 333 characters.</StepCard>
          <StepCard n="2" title="Unlock with your passphrase">Write and read only when the vault is open locally.</StepCard>
          <StepCard n="3" title="Generate a recap">Pick a period — last week, month, quarter, or year — and see your progress in your own voice.</StepCard>
        </div>
      </section>

      <footer className="border-t border-white/5 bg-[#06070A]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-zinc-500 md:flex-row">
          <span>© {new Date().getFullYear()} OneLine</span>
          <div className="flex flex-wrap items-center gap-4">
            <a className="transition hover:text-zinc-300" href="#benefits">
              Benefits
            </a>
            <a className="transition hover:text-zinc-300" href="#how">
              How it works
            </a>
            <a className="transition hover:text-zinc-300" href="/encryption">
              Encryption
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
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:56px_56px]" />
      <div className="aurora -top-28 left-[8%] h-[42vmax] w-[42vmax] bg-[radial-gradient(circle,rgba(99,102,241,0.25),transparent_60%)]" />
      <div className="aurora top-[10%] right-[-12%] h-[40vmax] w-[40vmax] bg-[radial-gradient(circle,rgba(16,185,129,0.22),transparent_60%)]" />
      <div className="aurora -bottom-28 left-1/2 h-[38vmax] w-[38vmax] -translate-x-1/2 bg-[radial-gradient(circle,rgba(236,72,153,0.18),transparent_60%)]" />
    </div>
  );
}
