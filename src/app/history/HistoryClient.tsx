// src/app/history/HistoryClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Entry = {
  id: string;
  content: string;
  created_at: string;
};

export default function HistoryClient({ initialEntries }: { initialEntries: Entry[] }) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries || []);
  const [loading, setLoading] = useState(false);

  // por si entras sin SSR (o quieres refrescar)
  useEffect(() => {
    if (initialEntries?.length) return;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/history?limit=200", { cache: "no-store" });
        if (res.ok) {
          const j = await res.json();
          setEntries(j.entries || []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [initialEntries]);

  if (loading && !entries.length) {
    return <p className="text-zinc-400 mt-6">Loading…</p>;
  }
  if (!entries.length) {
    return <p className="text-zinc-400 mt-6">No entries yet.</p>;
  }

  return (
    <ul className="space-y-4">
      {entries.map((e) => (
        <li key={e.id}>
          <EntryCard
            entry={e}
            onDelete={(id) => setEntries((cur) => cur.filter((x) => x.id !== id))}
            onSave={(id, content) =>
              setEntries((cur) => cur.map((x) => (x.id === id ? { ...x, content } : x)))
            }
          />
        </li>
      ))}
    </ul>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function EntryCard({
  entry,
  onDelete,
  onSave,
}: {
  entry: Entry;
  onDelete: (id: string) => void;
  onSave: (id: string, content: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(entry.content);
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(entry.content);
  }, [entry.content]);

  async function handleSave() {
    if (!text.trim() || text === entry.content) {
      setEditing(false);
      return;
    }
    setBusy("save");
    setError(null);
    const prev = entry.content;
    onSave(entry.id, text); // optimista

    try {
      const res = await fetch(`/api/history/${entry.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: text.trim() }),
      });
      if (!res.ok) {
        throw new Error((await res.json().catch(() => ({})))?.error || "Failed to save");
      }
      setEditing(false);
    } catch (e: any) {
      onSave(entry.id, prev); // revert
      setError(e?.message || "Failed to save");
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this entry?")) return;
    setBusy("delete");
    setError(null);
    const id = entry.id;
    try {
      onDelete(id); // optimista
      const res = await fetch(`/api/history/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error((await res.json().catch(() => ({})))?.error || "Failed to delete");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to delete");
      // si quisieras revertir la eliminación, tendrías que volver a recargar la lista desde el servidor
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-4 shadow-sm backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm text-zinc-400">{formatDate(entry.created_at)}</span>
        {!editing ? (
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-neutral-700"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={busy === "delete"}
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm text-white hover:bg-rose-500 disabled:opacity-60"
            >
              {busy === "delete" ? "Deleting…" : "Delete"}
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={busy === "save"}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {busy === "save" ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setText(entry.content);
                setError(null);
              }}
              className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-neutral-700"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {!editing ? (
        <p className="text-lg leading-relaxed text-zinc-100">{entry.content}</p>
      ) : (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-2 text-zinc-100 outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-indigo-500"
          placeholder="Edit your line…"
        />
      )}

      {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
    </div>
  );
}