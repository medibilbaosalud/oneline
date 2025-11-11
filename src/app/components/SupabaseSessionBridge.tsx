"use client";

import { useEffect, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

export default function SupabaseSessionBridge() {
  const { data: session, status } = useSession();
  const supabase = useMemo(() => supabaseBrowser(), []);
  const syncedWithGoogle = useRef(false);
  const signingIn = useRef(false);

  const googleIdToken = session?.googleIdToken;

  useEffect(() => {
    let active = true;

    if (status !== 'authenticated' || !googleIdToken || signingIn.current) {
      return () => {
        active = false;
      };
    }

    (async () => {
      try {
        signingIn.current = true;
        const { data: current } = await supabase.auth.getSession();
        if (!active) return;
        if (current.session) {
          const provider = (current.session.user as { app_metadata?: { provider?: string } })?.app_metadata?.provider;
          syncedWithGoogle.current = provider === 'google';
          return;
        }
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: googleIdToken,
        });
        if (error) {
          console.warn('[auth] Failed to sync Supabase session from NextAuth', error);
          return;
        }
        syncedWithGoogle.current = true;
      } finally {
        signingIn.current = false;
      }
    })();

    return () => {
      active = false;
    };
  }, [googleIdToken, status, supabase]);

  useEffect(() => {
    if (status === 'unauthenticated' && syncedWithGoogle.current) {
      supabase.auth.signOut().catch(() => undefined);
      syncedWithGoogle.current = false;
    }
  }, [status, supabase]);

  return null;
}
