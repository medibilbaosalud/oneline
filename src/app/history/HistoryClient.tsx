// src/app/history/HistoryClient.tsx
"use client";

import { useState } from "react";

type Entry = { id: string; content: string; created_at: string };

export default function HistoryClient({
  initialEntries,
}: {
  initialEntries: Entry[];
}) {
  const [items, setItems] = useState<Entry[]>(initialEntries);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  function fmtDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  }

  async function onEdit(id: string, content: string) {
    setEditingId(id);
    setDraft(content);
  }

  async function onCancel() {
    setEditingId(null);
    setDraft("");
  }

  async function onSave(id: string) {
    const res = await fetch(`/api/history/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: draft }),
      cache: "no-store",
    });
    if (!res.ok) {
      alert("Could not update entry.");
      return;
    }
    setItems((prev) =>
      prev.map((e) => (e.id === id ? { ...e, content: draft } : e))
    );
    setEditingId(null);
    setDraft("");
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this entry?")) return;
    const res = await fetch(`/api/history/${id}`, {
      method: "DELETE",
      cache: "no-store",
    });
    if (!res.ok) {
      alert("Could not delete entry.");
      return;
    }
    setItems((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="space-y-4">
      {items.map((e) => {
        const isEditing = editingId === e.id;
        return (
          <article
            key={e.id}
            className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5 shadow-sm"
          >
            <div className="mb-2 text-sm text-zinc-400">{fmtDate(e.created_at)}</div>

            {!isEditing ? (
              <p className="whitespace-pre-wrap text-lg leading-relaxed text-zinc-100">
                {e.content}
              </p>
            ) : (
              <textarea
                value={draft}
                onChange={(ev) => setDraft(ev.target.value)}
                rows={4}
                className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            )}

            <div className="mt-4 flex gap-2">
              {!isEditing ? (
                <>
                  <button
                    onClick={() => onEdit(e.id, e.content)}
                    className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-100 hover:bg-zinc-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(e.id)}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-500"
                  >
                    Delete
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onSave(e.id)}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500"
                  >
                    Save
                  </button>
                  <button
                    onClick={onCancel}
                    className="rounded-lg bg-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-100 hover:bg-zinc-600"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}