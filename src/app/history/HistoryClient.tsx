// src/app/history/HistoryClient.tsx
"use client";

import { useEffect, useState } from "react";

type Entry = { id: string; content: string; created_at: string };

export default function HistoryClient() {
  const [items, setItems] = useState<Entry[] | null>(null);

  async function load() {
    const res = await fetch("/api/history", { cache: "no-store" });
    const j = await res.json();
    setItems(j?.entries ?? []);
  }

  useEffect(() => { load(); }, []);

  async function edit(id: string) {
    const current = items?.find(i => i.id === id)?.content ?? "";
    const next = window.prompt("Edit entry:", current);
    if (next == null || next.trim() === current) return;
    const res = await fetch(`/api/history/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: next.trim() }),
    });
    if (res.ok) load();
    else alert((await res.json()).error ?? "Failed");
  }

  async function remove(id: string) {
    if (!confirm("Delete this entry?")) return;
    const res = await fetch(`/api/history/${id}`, { method: "DELETE" });
    if (res.ok) setItems(prev => prev?.filter(i => i.id !== id) ?? []);
    else alert((await res.json()).error ?? "Failed");
  }

  if (items === null) return <div className="text-zinc-400">Loading…</div>;
  if (!items.length) return <div className="text-zinc-400">No entries yet.</div>;

  return (
    <div className="space-y-4">
      {items.map((e) => (
        <article key={e.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-zinc-400">
            {new Date(e.created_at).toLocaleDateString("en-US", {
              weekday: "short", month: "short", day: "numeric", year: "numeric",
            })}
          </div>
          <div className="mt-2 text-lg text-zinc-100">{e.content}</div>
          <div className="mt-3 flex gap-3">
            <button onClick={() => edit(e.id)} className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700">
              Edit
            </button>
            <button onClick={() => remove(e.id)} className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm text-white hover:bg-rose-500">
              Delete
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}