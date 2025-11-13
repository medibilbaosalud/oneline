"use client";

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function SupabaseSessionSynchronizer() {
  const { data: session, status } = useSession();
  const attemptedRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (status !== 'authenticated') {
      attemptedRef.current = false;
      return;
    }

    if (!session?.googleIdToken) {
      return;
    }

    if (attemptedRef.current) {
      return;
    }

    attemptedRef.current = true;
    let cancelled = false;

    const controller = new AbortController();

    (async () => {
      try {
        const response = await fetch('/api/auth/sync-supabase', {
          method: 'POST',
          credentials: 'same-origin',
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Supabase sync failed with status ${response.status}`);
        }
        const payload = (await response.json().catch(() => undefined)) as
          | { linked?: boolean; reason?: string }
          | undefined;
        if (cancelled) return;
        if (payload?.linked) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('supabase-session-synced'));
          }
          router.refresh();
          return;
        }
        // If the bridge reports that it could not link the session, allow another attempt.
        attemptedRef.current = false;
        console.warn('[auth] Supabase session sync did not complete', payload);
      } catch (error) {
        if (cancelled) return;
        console.error('[auth] Failed to sync Supabase session', error);
        attemptedRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [router, session?.googleIdToken, status]);

  return null;
}
