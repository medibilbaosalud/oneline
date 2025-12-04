import { useEffect, useState } from "react";

import {
  ENTRY_LIMIT_BASE,
  GUIDANCE_NOTES_LIMIT_BASE,
} from "@/lib/summaryPreferences";

export type EntryLimits = {
  entryLimit: number;
  guidanceLimit: number;
  extendedGuidance: boolean;
};

const DEFAULT_LIMITS: EntryLimits = {
  entryLimit: ENTRY_LIMIT_BASE,
  guidanceLimit: GUIDANCE_NOTES_LIMIT_BASE,
  extendedGuidance: false,
};

let cachedLimits: EntryLimits | null = null;
let pendingRequest: Promise<EntryLimits> | null = null;

async function loadLimits(): Promise<EntryLimits> {
  try {
    const res = await fetch("/api/profile/limits", { cache: "no-store" });
    if (!res.ok) {
      return { ...DEFAULT_LIMITS };
    }
    const json = (await res.json().catch(() => null)) as Partial<EntryLimits> | null;
    if (!json) {
      return { ...DEFAULT_LIMITS };
    }
    const next: EntryLimits = {
      ...DEFAULT_LIMITS,
      ...json,
    };
    return next;
  } catch (error) {
    console.error("[useEntryLimits] fetch_error", error);
    return { ...DEFAULT_LIMITS };
  }
}

export function primeEntryLimitsCache(next: EntryLimits | null) {
  cachedLimits = next ? { ...next } : null;
}

export function useEntryLimits(initial?: Partial<EntryLimits>) {
  const [limits, setLimits] = useState<EntryLimits>(() => {
    if (cachedLimits) {
      return cachedLimits;
    }
    const seeded: EntryLimits = {
      ...DEFAULT_LIMITS,
      ...initial,
    };
    return seeded;
  });

  useEffect(() => {
    let cancelled = false;

    if (cachedLimits) {
      setLimits(cachedLimits);
      return () => {
        cancelled = true;
      };
    }

    if (!pendingRequest) {
      pendingRequest = loadLimits().finally(() => {
        pendingRequest = null;
      });
    }

    pendingRequest
      .then((value) => {
        if (cancelled) return;
        cachedLimits = value;
        setLimits(value);
      })
      .catch((error) => {
        console.error("[useEntryLimits] resolve_error", error);
        if (cancelled) return;
        setLimits({ ...DEFAULT_LIMITS });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return limits;
}
