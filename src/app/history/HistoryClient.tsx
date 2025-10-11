"use client";

import { useEffect, useState } from "react";

type Entry = { id: string; content: string; created_at: string };

export default function HistoryClient() {
  const [items, setItems] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  async function load() {
    try {
      setLoading(true);
      setErr(null);
      const res = await fetch("/api/history?limit=500", { cache: "no-store" });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Failed");
      setItems(j.entries || []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function onSave(id: string) {
    const res = await fetch(`/api/history/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: draft.trim() }),
    });
    const j = await res.json();
    if (!res.ok) return alert(j?.error || "Could not save");
    setEditing(null);
    setDraft("");
    await load();
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this entry?")) return;
    const res = await fetch(`/api/history/${id}`, { method: "DELETE" });
    const j = await res.json();
    if (!res.ok) return alert(j?.error || "Could not delete");
    await load();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-950 text-neutral-50">
        <div className="mx-auto max-w-3xl px-4 py-10">Loading…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-4xl font-bold">History</h1>
        {err && <p className="mt-2 text-rose-400">{err}</p>}

        {!items.length ? (
          <p className="mt-8 text-neutral-400">No entries yet.</p>
        ) : (
          <ul className="mt-6 space-y-4">
            {items.map((e) => {
              const d = new Date(e.created_at);
              const date = d.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              const isEditing = editing === e.id;

              return (
                <li
                  key={e.id}
                  className="rounded-2xl border border-white/10 bg-neutral-900/60 p-5"
                >
                  <div className="mb-2 text-sm text-neutral-400">{date}</div>

                  {isEditing ? (
                    <>
                      <textarea
                        value={draft}
                        onChange={(ev) => setDraft(ev.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-white/10 bg-neutral-900 p-3 outline-none"
                      />
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => onSave(e.id)}
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditing(null);
                            setDraft("");
                          }}
                          className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-lg leading-relaxed">{e.content}</p>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => {
                            setEditing(e.id);
                            setDraft(e.content);
                          }}
                          className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(e.id)}
                          className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-500"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}