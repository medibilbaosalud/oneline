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
            Capture a single, encrypted line in under a minute. Your browser locks it with your passphrase and OneLine turns those lines into clear monthly, quarterly, or yearly stories.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <ShinyCTA href="/today">Start now</ShinyCTA>
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

          <div className="mt-8 grid w-full max-w-3xl grid-cols-3 gap-3 text-left max-md:grid-cols-1">
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
            desc="Your passphrase derives the key locally. Without it, servers only store ciphertext."
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
        <div className="grid gap-8 rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-6 backdrop-blur md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4 text-pretty text-base leading-relaxed text-zinc-300 md:text-lg">
            <h2 className="text-left text-2xl font-semibold text-white">Privacy in plain English</h2>
            <p>Everything happens client-side: key derivation, encryption, and unlock. We never see your passphrase or plaintext.</p>
            <ul className="space-y-3 text-sm leading-relaxed text-zinc-400 md:text-base">
              <li className="flex gap-3">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>AES-GCM encryption before anything touches Supabase.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-400" />
                <span>Unlock with the exact same passphrase; lose it and the data stays locked.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
                <span>Export or delete anytime to exercise your data rights.</span>
              </li>
            </ul>
            <Link
              href="/encryption"
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-indigo-400/40 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_40px_rgba(79,70,229,0.25)] transition hover:border-indigo-300/50 hover:bg-indigo-500/20"
            >
              Learn more about the vault <span aria-hidden>→</span>
            </Link>
          </div>
          <div className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-zinc-200">
            <div className="rounded-xl border border-white/10 bg-black/40 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-indigo-200/80">What we store</p>
              <p className="mt-2 text-sm text-zinc-300">Ciphertext + IV only. Plain text never hits our database.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/40 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-indigo-200/80">When AI runs</p>
              <p className="mt-2 text-sm text-zinc-300">Only after you consent. Decrypt locally, send once, discard.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/40 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-indigo-200/80">No recovery</p>
              <p className="mt-2 text-sm text-zinc-300">We can’t reset your passphrase. It’s the cost of true privacy.</p>
            </div>
          </div>
        </div>
      </section>

      <LandingOnboardingSection />

      <section id="how" className="mx-auto mt-16 w-full max-w-6xl px-6 pb-16 md:mt-24 md:pb-20">
        <div className="grid gap-5 md:grid-cols-3">
          <StepCard n="1" title="End the day with one line">Two or three sentences that fit inside 333 characters.</StepCard>
          <StepCard n="2" title="Unlock with your passphrase">Write and read only when the vault is open locally.</StepCard>
          <StepCard n="3" title="Generate a recap">Pick a period — last week, month, quarter, or year — and get a faithful story.</StepCard>
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
