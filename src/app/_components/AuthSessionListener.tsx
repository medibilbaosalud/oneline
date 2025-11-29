"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { supabaseBrowser } from "@/lib/supabaseBrowser";

/**
 * Keeps Supabase cookies and sessions fresh so mobile and PWA users stay signed in.
 */
export function AuthSessionListener() {
  const router = useRouter();

  useEffect(() => {
    const supabase = supabaseBrowser();

    const syncSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          await fetch("/auth/callback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event: "INITIAL_SESSION", session: data.session }),
          });
        }
      } catch {
        // ignore sync errors silently
      }
    };

    syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      fetch("/auth/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, session }),
      })
        .then(() => {
          if (event === "SIGNED_OUT" || event === "SIGNED_IN") {
            router.refresh();
          }
        })
        .catch(() => {
          // ignore sync errors silently
        });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return null;
}

