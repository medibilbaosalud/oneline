"use client";

import { useMemo, useState } from "react";

export type AssistantVariant = "signup" | "tour";

type AssistantStep = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  helper?: string;
};

type VariantCopy = {
  badge: string;
  title: string;
};

const STEP_SETS: Record<AssistantVariant, AssistantStep[]> = {
  signup: [
    {
      title: "Step 1 · Open the entry point",
      description:
        "Tap “Start now — go to Today” or explore visitor mode. From either option you can create your account with email and password.",
      helper: "No confirmation emails — just pick credentials and you’re set.",
    },
    {
      title: "Step 2 · You’re signed in immediately",
      description:
        "We keep you logged in right after sign-up — no inbox trips or confirmation steps needed.",
      helper: "If anything fails, just sign in again with the password you chose to continue.",
    },
    {
      title: "Step 3 · Create your passphrase",
      description:
        "On your first visit we’ll ask for a passphrase. Store it securely — it encrypts and decrypts every line you write.",
      helper:
        "Tip: pick a long, memorable sentence with numbers or punctuation. Save it in a password manager so you never lose access.",
    },
    {
      title: "Done · Write your first line",
      description:
        "Head back to Today and capture something honest in 333 characters. That’s enough to start your reflection habit.",
      actionLabel: "Open Today",
      actionHref: "/today",
    },
  ],
  tour: [
    {
      title: "Why OneLine exists",
      description:
        "A single, encrypted line a day builds a science-backed reflection habit. Track what lifts or drains you, spot which people fuel you, and stay honest about how your mindset is shifting over time.",
      helper: "Short entries reduce friction while still revealing patterns in mood, energy, relationships, and progress.",
    },
    {
      title: "Today · Capture the signal",
      description:
        "Write a focused line that stays encrypted on-device. Streaks, quotes, and gentle nudges keep you consistent without turning journaling into a chore.",
      actionLabel: "Jump to Today",
      actionHref: "/today",
      helper: "Your vault decrypts locally with your passphrase; servers only see ciphertext.",
    },
    {
      title: "History · Revisit and compare",
      description:
        "Unlock past entries to see how themes evolve. Toggle the encrypted view to confirm what servers store, or read decrypted text when your vault is open.",
      actionLabel: "Browse History",
      actionHref: "/history",
      helper: "Use dates and context to notice what makes you happy, what doesn’t, and who adds or drains energy.",
    },
    {
      title: "Summaries · See the bigger story",
      description:
        "Opt into weekly, monthly, or yearly recaps to surface patterns. We decrypt locally, then help you notice growth, setbacks, and the experiences that matter most.",
      actionLabel: "Go to Summaries",
      actionHref: "/summaries",
      helper: "Exports stay under your control so you can share or keep them private.",
    },
    {
      title: "Settings · Privacy and control",
      description:
        "Fine-tune reminders, export or delete your vault, and update guidance options. Encryption defaults keep plaintext off our servers, and you decide when the vault unlocks.",
      actionLabel: "Open Settings",
      actionHref: "/settings",
      helper: "Lock the vault anytime to keep your words private, even from curious onlookers around you.",
    },
  ],
};

const VARIANT_COPY: Record<AssistantVariant, VariantCopy> = {
  signup: {
    badge: "Getting started",
    title: "Create your account in minutes",
  },
  tour: {
    badge: "Welcome tour",
    title: "Understand how OneLine moves you forward",
  },
};

type Props = {
  variant?: AssistantVariant;
  onDismiss?: () => void;
  className?: string;
};

export function OnboardingAssistant({ variant = "signup", onDismiss, className }: Props) {
  const steps = STEP_SETS[variant];
  const copy = VARIANT_COPY[variant];
  const [stepIndex, setStepIndex] = useState(0);
  const totalSteps = steps.length;
  const step = steps[stepIndex];

  const progress = useMemo(() => ((stepIndex + 1) / totalSteps) * 100, [stepIndex, totalSteps]);

  const goTo = (index: number) => {
    if (index < 0 || index >= totalSteps) return;
    setStepIndex(index);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 text-left text-sm text-zinc-200 backdrop-blur ${className ?? ""}`.trim()}
    >
      <div className="absolute -inset-20 -z-10 rounded-full bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_60%)] blur-3xl" />
      <div className="relative flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-[0.28em] text-emerald-200/80">{copy.badge}</span>
              <h2 className="text-lg font-semibold text-white">{copy.title}</h2>
            </div>
            {onDismiss ? (
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-full border border-white/10 bg-white/5 p-1 text-xs text-zinc-300 transition hover:bg-white/10 hover:text-white"
                aria-label="Close onboarding assistant"
              >
                ×
              </button>
            ) : null}
          </div>
        </header>

        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-indigo-400 to-fuchsia-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="tabular-nums text-white/70">{stepIndex + 1}&nbsp;/&nbsp;{totalSteps}</span>
        </div>

        <article className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4">
          <h3 className="text-base font-semibold text-white">{step.title}</h3>
          <p className="text-sm leading-relaxed text-zinc-300">{step.description}</p>
          {step.helper ? <p className="text-xs leading-relaxed text-zinc-400">{step.helper}</p> : null}
          {step.actionLabel && step.actionHref ? (
            <a
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-zinc-100 transition hover:bg-white/20"
              href={step.actionHref}
            >
              {step.actionLabel}
              <span aria-hidden>→</span>
            </a>
          ) : null}
        </article>

        <footer className="flex items-center justify-between text-xs text-zinc-400">
          <button
            type="button"
            onClick={() => goTo(stepIndex - 1)}
            disabled={stepIndex === 0}
            className="rounded-xl border border-white/10 px-4 py-2 font-medium text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <div className="flex items-center gap-1">
            {steps.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => goTo(index)}
                className={`h-2 w-2 rounded-full transition ${index === stepIndex ? "bg-emerald-400" : "bg-white/15 hover:bg-white/30"}`}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => goTo(stepIndex + 1)}
            disabled={stepIndex === totalSteps - 1}
            className="rounded-xl border border-white/10 px-4 py-2 font-medium text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </footer>
      </div>
    </div>
  );
}
