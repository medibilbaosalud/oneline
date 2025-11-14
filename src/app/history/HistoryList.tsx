"use client";

import { useState } from "react";

import { useEntryLimits } from "@/hooks/useEntryLimits";
import { ENTRY_LIMIT_BASE } from "@/lib/summaryPreferences";

type Entry = {
  id: string;
  content: string;
  created_at: string;
};

export default function HistoryList({ initialEntries }: { initialEntries: Entry[] }) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<string>("");
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { entryLimit } = useEntryLimits({ entryLimit: ENTRY_LIMIT_BASE });

  const startEdit = (id: string, current: string) => {
    setEditingId(id);
    setDraft(current.slice(0, entryLimit));
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft("");
    setError(null);
  };

  const saveEdit = async (id: string) => {
    try {
      setSaving(id);
      setError(null);
      const res = await fetch(`/api/journal/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: draft.slice(0, entryLimit) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Could not update");

      setEntries(prev =>
        prev.map(e => (e.id === id ? { ...e, content: (json.entry.content ?? '').slice(0, entryLimit) } : e))
      );
      setEditingId(null);
      setDraft("");
    } catch (e: any) {
      setError(e?.message ?? "Error updating");
    } finally {
      setSaving(null);
    }
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <div className="space-y-6">
      {entries.map((e) => (
        <div key={e.id} className="rounded-xl border border-zinc-800 p-4">
          <div className="text-sm text-zinc-400 mb-2">{fmt(e.created_at)}</div>

          {editingId === e.id ? (
            <>
              <textarea
                value={draft}
                onChange={(ev) => setDraft(ev.target.value.slice(0, entryLimit))}
                className="w-full rounded-md bg-zinc-900 border border-zinc-700 p-3 outline-none"
                rows={4}
                maxLength={entryLimit}
              />
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={() => saveEdit(e.id)}
                  disabled={saving === e.id}
                  className="px-3 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60"
                >
                  {saving === e.id ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={cancelEdit}
                  className="px-3 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700"
                >
                  Cancel
                </button>
                {error && <span className="text-red-400 text-sm">{error}</span>}
              </div>
            </>
          ) : (
            <>
              <p className="whitespace-pre-wrap leading-relaxed">{e.content}</p>
              <div className="mt-3">
                <button
                  onClick={() => startEdit(e.id, e.content)}
                  className="px-3 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700"
                >
                  Edit
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
