// src/app/history/SummaryHistory.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useVault } from "@/hooks/useVault";
import { deleteSummary, loadSummaries } from "@/lib/summaryHistory";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type SummaryItem = {
  id: string;
  createdAt: string;
  from?: string;
  to?: string;
  period?: string;
  text: string;
  imageUrl?: string;
};

type PeriodFilter = "all" | "weekly" | "monthly" | "yearly";

export default function SummaryHistory() {
  const { dataKey } = useVault();
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<SummaryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");

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

  // Filtered items based on search and period
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Period filter
      if (periodFilter !== "all" && item.period?.toLowerCase() !== periodFilter) {
        return false;
      }

      // Text search (case insensitive)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesText = item.text.toLowerCase().includes(query);
        const matchesDate = item.from?.includes(query) || item.to?.includes(query);
        if (!matchesText && !matchesDate) {
          return false;
        }
      }

      return true;
    });
  }, [items, searchQuery, periodFilter]);

  async function handleDelete(id: string) {
    if (!userId) return;
    const confirmed = window.confirm("Delete this saved summary? This cannot be undone.");
    if (!confirmed) return;

    setDeletingId(id);
    setError(null);
    try {
      await deleteSummary(userId, id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete this summary.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section id="summary-history" className="mt-10 space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Saved stories</p>
          <h2 className="text-lg font-semibold text-white">Summary history</h2>
          <p className="text-sm text-neutral-400">
            We keep an encrypted copy of every story you generate inside Supabase under your account. Unlock your vault to read them on any device.
          </p>
        </div>
      </header>

      {/* Search and Filter Bar */}
      {ready && !loading && items.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search Input */}
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stories..."
              className="w-full rounded-xl border border-white/10 bg-neutral-900/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder-neutral-500 outline-none ring-indigo-500/50 transition focus:border-indigo-500/50 focus:ring-2"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Period Filter */}
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
            className="rounded-xl border border-white/10 bg-neutral-900/80 px-4 py-2.5 text-sm text-white outline-none ring-indigo-500/50 transition focus:border-indigo-500/50 focus:ring-2"
          >
            <option value="all">All periods</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>

          {/* Results count */}
          <span className="text-xs text-neutral-500">
            {filteredItems.length} of {items.length} stories
          </span>
        </div>
      )}

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

      {ready && !loading && !error && items.length > 0 && filteredItems.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-neutral-950/70 p-5 text-sm text-neutral-300">
          No stories match your search. Try different keywords or filters.
        </div>
      )}

      {ready && !loading && !error && filteredItems.length > 0 && (
        <div className="space-y-3">
          {filteredItems.map((item) => (
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
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  className="ml-auto inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-100 transition hover:border-rose-400/60 hover:text-white disabled:opacity-50"
                >
                  {deletingId === item.id ? "Deleting…" : "Delete"}
                </button>
              </div>

              {/* Cover Image */}
              {item.imageUrl && (
                <div className="relative mt-4 flex justify-center overflow-hidden rounded-xl bg-black/20">
                  <img
                    src={item.imageUrl}
                    alt="Story cover"
                    className="max-h-80 w-auto max-w-full rounded-xl object-contain"
                    loading="lazy"
                  />
                  <div className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/70">
                    Cover
                  </div>
                </div>
              )}

              <div className="relative mt-3 space-y-2 font-serif text-[16px] leading-relaxed text-zinc-50">
                {item.text
                  .trim()
                  .split(/\n\s*\n/)
                  .map((para, idx) => (
                    <p
                      key={idx}
                      className="rounded-xl bg-white/5 px-4 py-3 text-[16px] leading-[1.6] shadow-inner shadow-black/10 ring-1 ring-white/5"
                      dangerouslySetInnerHTML={{
                        __html: para
                          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                          .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<strong>$1</strong>')
                      }}
                    />
                  ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

