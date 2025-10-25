// src/app/history/EntryItem.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EntryItem({
  id,
  content,
  created_at,
}: {
  id: string;
  content: string;
  created_at: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(content);
  const [loading, setLoading] = useState(false);

  const dt = new Date(created_at);
  const dateStr = dt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = dt.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  async function save() {
    setLoading(true);
    try {
      const res = await fetch(`/api/journal/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      if (!res.ok) throw new Error(await res.text());
      setEditing(false);
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("Could not save. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function del() {
    if (!confirm("Delete this entry?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/journal/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("Could not delete. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <li className="rounded-xl border border-zinc-800 p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-400 mb-1">
        {dateStr} · {timeStr}
      </div>

      {editing ? (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded-md bg-zinc-900 border border-zinc-700 p-2"
            rows={4}
            maxLength={333}
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={save}
              disabled={loading}
              className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-sm"
            >
              {loading ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setText(content);
              }}
              className="px-3 py-1 rounded bg-zinc-700 text-sm"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1 rounded bg-zinc-700 text-sm"
            >
              Edit
            </button>
            <button
              onClick={del}
              className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-sm"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </li>
  );
}