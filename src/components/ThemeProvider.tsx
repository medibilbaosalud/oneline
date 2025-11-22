"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type ThemeMode = "light" | "dark";

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (value: ThemeMode) => void;
  ready: boolean;
};

const STORAGE_KEY = "oneline-theme";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(value: ThemeMode) {
  if (typeof document === "undefined") return;
  const body = document.body;
  body.classList.remove("theme-light", "theme-dark");
  body.classList.add(`theme-${value}`);
  body.dataset.theme = value;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("dark");
  const [ready, setReady] = useState(false);
  const [hasStoredPreference, setHasStoredPreference] = useState(false);

  const commitTheme = (value: ThemeMode, persist = true) => {
    setThemeState(value);
    applyTheme(value);
    if (persist && typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, value);
    }
  };

  useEffect(() => {
    const stored = (typeof window !== "undefined"
      ? (localStorage.getItem(STORAGE_KEY) as ThemeMode | null)
      : null) as ThemeMode | null;
    setHasStoredPreference(stored === "light" || stored === "dark");
    const prefersLight =
      typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia("(prefers-color-scheme: light)").matches
        : false;
    const initial: ThemeMode = stored === "light" || stored === "dark"
      ? stored
      : prefersLight
        ? "light"
        : "dark";

    commitTheme(initial, true);
    setReady(true);

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        const next = event.newValue === "light" ? "light" : "dark";
        commitTheme(next, false);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const setTheme = (value: ThemeMode) => {
    commitTheme(value, true);
  };

  useEffect(() => {
    if (hasStoredPreference) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store", credentials: "include" });
        if (!res.ok) return;
        const json = await res.json();
        const serverTheme = json?.settings?.storyPreferences?.theme as ThemeMode | undefined;
        if (!cancelled && (serverTheme === "light" || serverTheme === "dark")) {
          commitTheme(serverTheme, true);
        }
      } catch (err) {
        console.warn("[theme] unable to fetch saved appearance", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasStoredPreference]);

  const value = useMemo(() => ({ theme, setTheme, ready }), [theme, ready]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
