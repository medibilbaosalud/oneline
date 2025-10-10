"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Entry = {
  id: string;
  content: string;
  created_at: string; // ISO
};

export default function EntryCard({ entry }: { entry: Entry }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(entry.content);
  const [loading, setLoading] = useState<"save" | "delete" | null>(null);
  const router = useRouter();

  const date = new Date(entry.created_at);
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  async function onSave() {
    setLoading("save");
    try {
      const res = await fetch(`/api/journal-item/${entry.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: value }),
      });
      if (!res.ok) throw new Error("Save failed");
      setIsEditing(false);
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("Could not save. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  async function onDelete() {
    if (!confirm("Delete this entry?")) return;
    setLoading("delete");
    try {
      const res = await fetch(`/api/journal-item/${entry.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("Could not delete. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <article
      className="
        group relative flex flex-col justify-between
        rounded-2xl bg-zinc-900/70 ring-1 ring-zinc-800
        hover:ring-zinc-700 transition-all shadow-lg shadow-black/20
        p-4 w-[320px] min-h-[240px]
      "
    >
      {/* Fecha */}
      <time className="text-xs uppercase tracking-widest text-zinc-400 select-none">
        {dateLabel}
      </time>

      {/* Contenido o textarea */}
      {!isEditing ? (
        <p className="mt-4 text-zinc-100 leading-relaxed whitespace-pre-wrap">
          {entry.content || <span className="text-zinc-500">—</span>}
        </p>
      ) : (
        <textarea
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={300}
          className="
            mt-4 h-40 w-full resize-none rounded-xl
            bg-zinc-950/80 text-zinc-50 placeholder:text-zinc-500
            outline-none ring-1 ring-zinc-800 focus:ring-2 focus:ring-indigo-500/60
            p-3 leading-relaxed
          "
          placeholder="Edit your line…"
        />
      )}

      {/* Botonera */}
      <div className="mt-6 flex items-center gap-2">
        {!isEditing ? (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className="
                inline-flex items-center gap-2 rounded-xl
                bg-zinc-800 text-zinc-100 ring-1 ring-zinc-700/70
                hover:bg-zinc-750 hover:ring-zinc-600
                px-3.5 py-2 text-sm transition
              "
            >
              Edit
            </button>
            <button
              onClick={onDelete}
              disabled={loading === "delete"}
              className="
                inline-flex items-center gap-2 rounded-xl
                bg-rose-600 text-white shadow-lg shadow-rose-600/20
                hover:bg-rose-500 active:bg-rose-500/90
                px-3.5 py-2 text-sm transition disabled:opacity-60
              "
            >
              {loading === "delete" ? "Deleting…" : "Delete"}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onSave}
              disabled={loading === "save"}
              className="
                inline-flex items-center gap-2 rounded-xl
                bg-indigo-500 text-white shadow-lg shadow-indigo-500/25
                hover:bg-indigo-400 active:bg-indigo-500/90
                px-3.5 py-2 text-sm transition disabled:opacity-60
              "
            >
              {loading === "save" ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => { setIsEditing(false); setValue(entry.content); }}
              className="
                inline-flex items-center gap-2 rounded-xl
                bg-transparent text-zinc-400 hover:text-zinc-200
                ring-1 ring-zinc-700/0 hover:ring-zinc-700/60
                px-3.5 py-2 text-sm transition
              "
            >
              Cancel
            </button>
          </>
        )}
      </div>

      {/* Glow sutil al hover */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-0 transition group-hover:ring-1 group-hover:ring-indigo-500/20" />
    </article>
  );
}