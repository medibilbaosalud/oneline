// src/app/history/SummaryHistory.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useVault } from "@/hooks/useVault";
import { loadSummaries } from "@/lib/summaryHistory";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type SummaryItem = {
  id: string;
  createdAt: string;
  from?: string;
  to?: string;
  period?: string;
  text: string;
};

export default function SummaryHistory() {
  const { dataKey } = useVault();
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<SummaryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = supabaseBrowser();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
    })();
  }, []);

  const ready = useMemo(() => !!dataKey && !!userId, [dataKey, userId]);

  useEffect(() => {
    if (!ready || !dataKey || !userId) return;

    let active = true;
    setLoading(true);
    setError(null);

    loadSummaries(userId, dataKey)
      .then((list) => {
        if (!active) return;
        const sorted = [...list].sort(
          (a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf(),
        );
        setItems(sorted);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to read saved summaries.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dataKey, ready, userId]);

  return (
    <section id="summary-history" className="mt-10 space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Saved stories</p>
          <h2 className="text-lg font-semibold text-white">Summary history</h2>
          <p className="text-sm text-neutral-400">
            We keep an encrypted copy of every story you generate on this device—nothing goes to Supabase. Unlock your vault to read them.
          </p>
        </div>
      </header>

      {!ready && (
        <div className="rounded-2xl border border-white/10 bg-neutral-950/70 p-5 text-sm text-neutral-300">
          Unlock your vault to view saved summaries.
        </div>
      )}

      {ready && loading && (
        <div className="rounded-2xl border border-white/10 bg-neutral-950/70 p-5 text-sm text-neutral-300">
          Loading encrypted summaries…
        </div>
      )}

      {ready && !loading && error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-100">{error}</div>
      )}

      {ready && !loading && !error && items.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-neutral-950/70 p-5 text-sm text-neutral-300">
          No summaries saved yet. Generate one and it will appear here.
        </div>
      )}

      {ready && !loading && !error && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 via-indigo-900/10 to-black p-5 shadow-lg shadow-indigo-950/40"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.08),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(236,72,153,0.08),transparent_26%)]" />
              <div className="relative flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-indigo-100">
                <span className="h-[2px] w-6 rounded-full bg-indigo-400" />
                <span>{item.period ? `${item.period} recap` : "Summary"}</span>
                <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold text-indigo-50">Encrypted</span>
                <span className="text-neutral-400">
                  {new Date(item.createdAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {(item.from || item.to) && (
                  <span className="text-neutral-400">
                    {(item.from ?? "?") + " → " + (item.to ?? "?")}
                  </span>
                )}
              </div>

              <div className="relative mt-3 space-y-2 font-serif text-[16px] leading-relaxed text-zinc-50">
                {item.text
                  .trim()
                  .split(/\n\s*\n/)
                  .map((para, idx) => (
                    <p
                      key={idx}
                      className="rounded-xl bg-white/5 px-4 py-3 text-[16px] leading-[1.6] shadow-inner shadow-black/10 ring-1 ring-white/5"
                    >
                      {para}
                    </p>
                  ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

