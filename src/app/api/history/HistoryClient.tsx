// src/app/history/HistoryClient.tsx
"use client";

import { useEffect, useState } from "react";

type Entry = { id: string; content: string; created_at: string };

export default function HistoryClient() {
  const [items, setItems] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/history", { cache: "no-store" });
        const j = await res.json();
        if (!alive) return;
        setItems(j?.entries ?? []);
      } catch {
        if (!alive) return;
        setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  async function onEdit(e: Entry) {
    const next = window.prompt("Edit entry:", e.content);
    if (next == null) return; // cancelado
    const newContent = next.trim();
    if (!newContent) return;

    // Optimista
    setItems(prev => prev.map(it => it.id === e.id ? { ...it, content: newContent } : it));
    const res = await fetch(`/api/history/${e.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: newContent }),
    });
    if (!res.ok) {
      // Revert the optimistic update if the request failed
      setItems(prev => prev.map(it => it.id === e.id ? { ...it, content: e.content } : it));
      const j = await res.json().catch(() => ({}));
      alert(j?.error || "Could not update");
    }
  }

  async function onDelete(e: Entry) {
    const ok = window.confirm("Delete this entry?");
    if (!ok) return;

    // Optimista
    const prev = items;
    setItems(prev.filter(it => it.id !== e.id));

    const res = await fetch(`/api/history/${e.id}`, { method: "DELETE" });
    if (!res.ok) {
      setItems(prev); // revertir
      const j = await res.json().catch(() => ({}));
      alert(j?.error || "Could not delete");
    }
  }

  if (loading) return <p className="text-zinc-400">Loading…</p>;
  if (!items.length) return <p className="text-zinc-400">No entries yet.</p>;

  return (
    <div className="space-y-4">
      {items.map((e) => (
        <article
          key={e.id}
          className="rounded-2xl border border-white/10 bg-black/30 p-5"
        >
          <div className="mb-2 text-sm text-zinc-400">
            {new Date(e.created_at).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
          <p className="text-lg text-zinc-100">{e.content}</p>

          <div className="mt-4 flex gap-3">
            <button
              onClick={() => onEdit(e)}
              className="rounded-md bg-zinc-800 px-3 py-1.5 text-sm text-white hover:bg-zinc-700"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(e)}
              className="rounded-md bg-rose-600 px-3 py-1.5 text-sm text-white hover:bg-rose-500"
            >
              Delete
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}