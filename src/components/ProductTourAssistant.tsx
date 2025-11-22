"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

import { OnboardingAssistant } from "@/components/OnboardingAssistant";

const STORAGE_PREFIX = "oneline:onboarding:tour:seen:";
const INTENT_KEY = "oneline:onboarding:tour:intent";

export function ProductTourAssistant() {
  const supabase = useMemo(() => createClientComponentClient(), []);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [canRender, setCanRender] = useState(false);
  const hasSyncedRemoteSeen = useRef(false);

  const markTourSeen = useCallback(
    async (key: string | null) => {
      const timestamp = new Date().toISOString();

      if (typeof window !== "undefined" && key) {
        window.localStorage.setItem(key, timestamp);
      }

      if (hasSyncedRemoteSeen.current) return;

      try {
        await supabase.auth.updateUser({ data: { onboarding_tour_seen_at: timestamp } });
        hasSyncedRemoteSeen.current = true;
      } catch (err) {
        console.error("[tour] failed to persist seen flag", err);
      }
    },
    [supabase],
  );

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

        let shouldAutoOpen = false;
        if (typeof window !== "undefined") {
          const hasSeenLocal = Boolean(window.localStorage.getItem(key));
          const hasSeenRemote = Boolean(user.user_metadata?.onboarding_tour_seen_at);
          const hasSeen = hasSeenLocal || hasSeenRemote;
          const intent = window.localStorage.getItem(INTENT_KEY);
          const firstVisit = !hasSeenLocal;

          shouldAutoOpen = !hasSeen && (firstVisit || Boolean(intent));

          if (intent) {
            window.localStorage.removeItem(INTENT_KEY);
          }

          if (shouldAutoOpen) {
            markTourSeen(key);
          }
        }

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
  }, [markTourSeen, supabase]);

  useEffect(() => {
    if (ready) return;
    if (typeof window !== "undefined") {
      setReady(true);
    }
  }, [ready]);

  const handleDismiss = useCallback(() => {
    markTourSeen(storageKey);
    setOpen(false);
  }, [markTourSeen, storageKey]);

  const handleOpen = useCallback(() => {
    markTourSeen(storageKey);
    setOpen(true);
  }, [markTourSeen, storageKey]);

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
