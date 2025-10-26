"use client";

import { useCallback, useEffect, useState } from "react";

import { OnboardingAssistant } from "@/components/OnboardingAssistant";

const TOUR_INTENT_KEY = "oneline:onboarding:tour:intent";

export function LandingOnboardingSection() {
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHydrated(true);
  }, []);

  const handleDismiss = useCallback(() => {
    setOpen(false);
  }, []);

  const handleOpen = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TOUR_INTENT_KEY, "pending");
    }
    setOpen(true);
  }, []);

  return (
    <section className="relative mx-auto mt-20 w-full max-w-6xl px-6 md:mt-24">
      <div className="grid gap-8 md:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5 text-pretty text-base leading-relaxed text-zinc-300 md:text-lg">
          <h2 className="text-left text-2xl font-semibold text-white">Guided setup for brand-new writers</h2>
          <p>
            Curious before you commit? Launch the onboarding assistant to tour visitor mode, learn how sign-up works, and see
            what happens after you confirm your email.
          </p>
          <p className="text-sm text-zinc-400 md:text-base">
            When you finish creating your account and log in, the tour automatically returns inside the app to explain Today,
            History, Summaries, and Settings.
          </p>
          {!open && hydrated ? (
            <button
              type="button"
              onClick={handleOpen}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-white/10"
            >
              Launch the onboarding assistant
              <span aria-hidden>→</span>
            </button>
          ) : null}
        </div>
        {open && hydrated ? <OnboardingAssistant variant="signup" onDismiss={handleDismiss} /> : null}
      </div>
    </section>
  );
}
