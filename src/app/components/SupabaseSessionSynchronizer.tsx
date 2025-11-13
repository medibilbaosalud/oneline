"use client";

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

export default function SupabaseSessionSynchronizer() {
  const { data: session, status } = useSession();
  const attemptedRef = useRef(false);

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

    fetch('/api/auth/sync-supabase', {
      method: 'POST',
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Supabase sync failed with status ${response.status}`);
        }
        return response.json().catch(() => undefined);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('[auth] Failed to sync Supabase session', error);
        attemptedRef.current = false;
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [session?.googleIdToken, status]);

  return null;
}
