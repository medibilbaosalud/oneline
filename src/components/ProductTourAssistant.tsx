"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

import { OnboardingAssistant } from "@/components/OnboardingAssistant";

const STORAGE_PREFIX = "oneline:onboarding:tour:";
const RECENT_WINDOW_MS = 10 * 60 * 1000;
const FIRST_SESSION_TOLERANCE_MS = 60 * 1000;

export function ProductTourAssistant() {
  const supabase = useMemo(() => createClientComponentClient(), []);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [canRender, setCanRender] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        const user = data.session?.user;
        if (!user) {
          setReady(true);
          setCanRender(false);
          setStorageKey(null);
          setOpen(false);
          return;
        }

        const key = `${STORAGE_PREFIX}${user.id}`;
        setStorageKey(key);

        const now = Date.now();
        const createdAt = user.created_at ? Date.parse(user.created_at) : null;
        const lastSignIn = user.last_sign_in_at ? Date.parse(user.last_sign_in_at) : null;
        const firstSession = Boolean(
          createdAt &&
            lastSignIn &&
            Math.abs(lastSignIn - createdAt) <= FIRST_SESSION_TOLERANCE_MS,
        );
        const createdRecently = Boolean(createdAt && now - createdAt <= RECENT_WINDOW_MS);

        let hasSeen = false;
        if (typeof window !== "undefined") {
          hasSeen = Boolean(window.localStorage.getItem(key));
        }

        const shouldAutoOpen = (firstSession || createdRecently) && !hasSeen;

        setCanRender(true);
        setOpen(shouldAutoOpen);
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (ready) return;
    if (typeof window !== "undefined") {
      setReady(true);
    }
  }, [ready]);

  const handleDismiss = useCallback(() => {
    if (storageKey && typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, new Date().toISOString());
    }
    setOpen(false);
  }, [storageKey]);

  const handleOpen = useCallback(() => {
    setOpen(true);
  }, []);

  if (!ready || !canRender) {
    return null;
  }

  return (
    <div className="mb-8 space-y-3">
      {open ? (
        <OnboardingAssistant variant="tour" onDismiss={handleDismiss} />
      ) : null}
      {!open ? (
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-white/10"
        >
          Show the welcome tour again
          <span aria-hidden>→</span>
        </button>
      ) : null}
    </div>
  );
}
