"use client";

import { useCallback, useEffect, useState } from "react";

import { OnboardingAssistant } from "@/components/OnboardingAssistant";

const STORAGE_KEY = "oneline:onboarding:signup";

export function LandingOnboardingSection() {
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = window.localStorage.getItem(STORAGE_KEY);
    setOpen(!dismissed);
    setHydrated(true);
  }, []);

  const handleDismiss = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    }
    setOpen(false);
  }, []);

  const handleOpen = useCallback(() => {
    setOpen(true);
  }, []);

  return (
    <section className="relative mx-auto mt-20 w-full max-w-6xl px-6 md:mt-24">
      <div className="grid gap-8 md:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5 text-pretty text-base leading-relaxed text-zinc-300 md:text-lg">
          <h2 className="text-left text-2xl font-semibold text-white">New here? We’ll guide every step</h2>
          <p>
            The onboarding assistant opens automatically for first-time visitors so you can see how sign-up, email confirmation,
            and passphrase creation work before writing anything.
          </p>
          <p className="text-sm text-zinc-400 md:text-base">
            Finish creating your account and the same assistant appears inside the app again — this time it explains Today,
            History, Summaries, and Settings so you know what each page is for.
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
