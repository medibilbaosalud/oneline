// src/app/page.tsx
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = 'force-dynamic';

import { SignupFeedbackBanner } from "@/components/SignupFeedbackBanner";
import { LandingDemo } from "@/components/LandingDemo";
import { ComparisonTable } from "@/components/ComparisonTable";
import { FeatureShowcase } from "@/components/FeatureShowcase";
import { SocialProof, Testimonials } from "@/components/SocialProof";
import { StoryPreview } from "@/components/StoryPreview";
import { FAQ } from "@/components/FAQ";
import { VisitorModeButton } from "@/components/VisitorModeButton";

export const metadata: Metadata = {
  title: "OneLine — Capture your day in 30 seconds",
  description:
    "Not a note app. OneLine helps you write one encrypted line daily, then generates AI-powered stories from your weeks and months. Build real self-awareness.",
  openGraph: {
    title: "OneLine — Your brain forgets 80% of your day",
    description: "Capture it in 30 seconds flat. Encrypted, private, AI-powered stories.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OneLine — Capture your day in 30 seconds",
    description: "Not a note app. Build real self-awareness with encrypted daily journaling.",
  },
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

      {/* ============ HERO SECTION ============ */}
      <section className="relative mx-auto w-full max-w-6xl px-6 pt-12 md:pt-20">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          {/* Differentiator badge */}
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-400" />
            Not a note app
          </span>

          <h1 className="mt-6 bg-gradient-to-br from-white via-zinc-200 to-zinc-500 bg-clip-text text-4xl font-bold leading-[1.1] text-transparent md:text-6xl lg:text-7xl">
            Your brain forgets 80%<br className="hidden sm:block" /> of your day.
          </h1>
          <p className="mt-4 text-xl font-medium text-indigo-400 md:text-2xl">
            OneLine captures it in 30 seconds flat.
          </p>
          <p className="mt-4 max-w-xl text-pretty text-base text-zinc-400 md:text-lg">
            Write 333 characters before bed. Encrypted privacy. Streaks that stick. AI stories in your voice.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <ShinyCTA href="/today">
              <span className="flex flex-col items-center leading-tight">
                <span>Start writing now</span>
                <span className="text-xs font-normal text-white/70">Free forever • No credit card</span>
              </span>
            </ShinyCTA>
            <VisitorModeButton />
            <Link
              href="#demo"
              className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-white/10"
            >
              Watch it work ↓
            </Link>
          </div>

          {/* Quick stats */}
          <div className="mt-10 grid w-full max-w-xl grid-cols-3 gap-3 text-center">
            <QuickStat value="333" label="characters max" />
            <QuickStat value="30s" label="avg. time" />
            <QuickStat value="E2E" label="encrypted" />
          </div>
        </div>
      </section>

      {/* ============ SOCIAL PROOF STATS ============ */}
      <section className="relative mx-auto mt-16 w-full md:mt-24">
        <SocialProof />
      </section>

      {/* ============ INTERACTIVE DEMO ============ */}
      <section id="demo" className="relative mx-auto mt-20 w-full max-w-6xl px-6 md:mt-28">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-semibold text-white md:text-3xl">See it in action</h2>
          <p className="mt-2 text-zinc-400">Watch how fast one line gets saved and encrypted</p>
        </div>
        <LandingDemo />
      </section>

      {/* ============ COMPARISON TABLE ============ */}
      <section className="relative mx-auto mt-24 w-full max-w-6xl px-6 md:mt-32">
        <div className="mb-10 text-center">
          <span className="inline-block rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-zinc-400">
            Why this is different
          </span>
          <h2 className="mt-4 text-2xl font-semibold text-white md:text-3xl">
            Notes app? Been there, abandoned that.
          </h2>
          <p className="mt-2 max-w-lg mx-auto text-zinc-400">
            You've tried journals, notes, and diaries. They all end the same way.
          </p>
        </div>
        <ComparisonTable />
      </section>

      {/* ============ STORY PREVIEW ============ */}
      <section className="relative mx-auto mt-24 w-full md:mt-32">
        <StoryPreview />
      </section>

      {/* ============ FEATURE DEMOS ============ */}
      <section className="relative mx-auto mt-24 w-full max-w-6xl px-6 md:mt-32">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-semibold text-white md:text-3xl">Three things that change everything</h2>
          <p className="mt-2 text-zinc-400">The secret sauce that makes this habit stick</p>
        </div>
        <FeatureShowcase />
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="relative mx-auto mt-24 w-full md:mt-32">
        <Testimonials />
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how" className="mx-auto mt-24 w-full max-w-6xl px-6 md:mt-32">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-semibold text-white md:text-3xl">How it works</h2>
          <p className="mt-2 text-zinc-400">Your evening ritual in 3 steps</p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <StepCard n="1" title="Write one line before bed">
            Two or three sentences about your day. That's it — 333 characters max.
          </StepCard>
          <StepCard n="2" title="It's encrypted instantly">
            Your passphrase creates the key. Servers only see ciphertext.
          </StepCard>
          <StepCard n="3" title="Generate your story">
            Pick a week, month, or year. AI writes your narrative in your voice.
          </StepCard>
        </div>
      </section>

      {/* ============ PRIVACY SECTION (Condensed) ============ */}
      <section className="relative mx-auto mt-24 w-full max-w-6xl px-6 md:mt-32">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/5 via-transparent to-indigo-500/5 p-8 md:p-12">
          <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr] items-center">
            <div className="space-y-4">
              <span className="inline-block text-3xl">🔐</span>
              <h2 className="text-2xl font-semibold text-white md:text-3xl">
                Privacy that actually holds
              </h2>
              <p className="text-zinc-300">
                Your passphrase creates the encryption key locally. We never see your plaintext — the servers only store ciphertext.
              </p>
              <ul className="space-y-2 text-sm text-zinc-300">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  AES-GCM encryption before anything touches the cloud
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Zero-knowledge — we can't read your entries even if we wanted to
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Export your data anytime in plain JSON
                </li>
              </ul>
              <Link
                href="/encryption"
                className="inline-flex items-center gap-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition"
              >
                Learn how encryption works <span aria-hidden>→</span>
              </Link>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-center">
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Passphrase = Key</p>
              <p className="text-lg font-semibold text-white mb-2">Lose it and the vault stays sealed</p>
              <p className="text-sm text-zinc-400">
                We cannot reset your passphrase. That's the whole point.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="relative mx-auto mt-24 w-full md:mt-32">
        <FAQ />
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="relative mx-auto mt-24 w-full max-w-4xl px-6 md:mt-32">
        <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-b from-indigo-500/10 to-transparent p-10 text-center md:p-14">
          <h2 className="text-2xl font-semibold text-white md:text-4xl">
            Start your first line tonight
          </h2>
          <p className="mt-3 text-zinc-400 max-w-lg mx-auto">
            Takes 30 seconds. Free forever for daily entries. Your words stay encrypted and private.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <ShinyCTA href="/today" large>
              Start writing now
            </ShinyCTA>
            <Link
              href="/visitor"
              className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-white/10"
            >
              Try visitor mode first
            </Link>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="mt-24 border-t border-white/5 bg-[#06070A]">
        <div className="mx-auto w-full max-w-6xl px-6 py-12">
          <div className="grid gap-8 md:grid-cols-4">
            {/* Brand */}
            <div className="md:col-span-2">
              <Link href="/" className="text-xl font-bold text-white">
                OneLine
              </Link>
              <p className="mt-3 text-sm text-zinc-400 max-w-sm">
                One honest line a day. Encrypted by default. AI-powered stories that read like you.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs font-medium text-emerald-400">
                  ✓ GDPR Compliant
                </span>
                <span className="rounded-full bg-indigo-500/20 border border-indigo-500/30 px-3 py-1 text-xs font-medium text-indigo-400">
                  ✓ E2E Encrypted
                </span>
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li><Link href="/today" className="hover:text-white transition">Today</Link></li>
                <li><Link href="/history" className="hover:text-white transition">History</Link></li>
                <li><Link href="/summaries" className="hover:text-white transition">Summaries</Link></li>
                <li><Link href="/encryption" className="hover:text-white transition">Encryption</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li><Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition">Terms of Service</Link></li>
                <li><Link href="/cookies" className="hover:text-white transition">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-10 pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
            <span>© {new Date().getFullYear()} OneLine. Made with 🧠 for self-awareness.</span>
            <div className="flex items-center gap-4">
              <span className="text-xs">Built with Next.js • Hosted on Vercel</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ---------- Tiny components ---------- */

function QuickStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-xs text-zinc-500">{label}</div>
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
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-sm font-bold text-white">
        {n}
      </div>
      <h4 className="text-lg font-semibold text-white">{title}</h4>
      <p className="mt-2 text-sm text-zinc-400">{children}</p>
    </div>
  );
}

function ShinyCTA({
  href,
  children,
  large,
}: {
  href: string;
  children: React.ReactNode;
  large?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`shiny-cta relative inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:shadow-fuchsia-500/25 ${large ? "px-8 py-4 text-base" : "px-6 py-3 text-sm"
        }`}
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
