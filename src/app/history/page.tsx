"use client";

import { useEffect, useState } from "react";

type Entry = {
  id: string;
  content: string;
  created_at: string;
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function HistoryPage() {
  const [items, setItems] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/journal/history", { cache: "no-store" });
      const j = await res.json();
      setItems(j.entries ?? []);
      setLoading(false);
    })();
  }, []);

  async function save(id: string) {
    const newText = editing[id] ?? "";
    if (!newText.trim()) return;
    setBusy(id);
    const res = await fetch(`/api/journal/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: newText }),
    });
    setBusy(null);
    if (!res.ok) return; // opcional: mostrar error
    const { entry } = await res.json();
    setItems(prev => prev.map(it => (it.id === id ? entry : it)));
    setEditing(prev => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  }

  async function remove(id: string) {
    if (!confirm("Delete this entry?")) return;
    setBusy(id);
    const res = await fetch(`/api/journal/${id}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) return;
    setItems(prev => prev.filter(it => it.id !== id));
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-4xl font-semibold">History</h1>

        {loading && <div className="text-neutral-400">Loading…</div>}

        <div className="flex flex-col gap-6">
          {items.map(it => {
            const isEdit = editing[it.id] !== undefined;
            return (
              <article
                key={it.id}
                className="rounded-3xl border border-white/10 bg-neutral-900/60 p-5 shadow-sm ring-1 ring-black/5"
              >
                <div className="mb-3 text-sm text-neutral-400">{fmt(it.created_at)}</div>

                {isEdit ? (
                  <textarea
                    value={editing[it.id]}
                    onChange={e => setEditing(s => ({ ...s, [it.id]: e.target.value }))}
                    className="min-h-[120px] w-full resize-vertical rounded-xl bg-neutral-900 p-4 leading-relaxed outline-none ring-1 ring-white/10"
                  />
                ) : (
                  <p className="text-lg leading-relaxed text-neutral-100">{it.content}</p>
                )}

                <div className="mt-4 flex gap-2">
                  {isEdit ? (
                    <>
                      <button
                        onClick={() => save(it.id)}
                        disabled={busy === it.id}
                        className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-40"
                      >
                        {busy === it.id ? "Saving…" : "Save"}
                      </button>
                      <button
                        onClick={() =>
                          setEditing(prev => {
                            const { [it.id]: _, ...rest } = prev;
                            return rest;
                          })
                        }
                        className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-700"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setEditing(s => ({ ...s, [it.id]: it.content }))}
                      className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-700"
                    >
                      Edit
                    </button>
                  )}

                  <button
                    onClick={() => remove(it.id)}
                    disabled={busy === it.id}
                    className="ml-auto rounded-lg bg-rose-500/90 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-400 disabled:opacity-40"
                  >
                    {busy === it.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}