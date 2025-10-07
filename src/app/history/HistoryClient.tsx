"use client";

import { useMemo, useState } from "react";

type Item = {
  id: string;
  day: string;
  created_at: string;
  content: string | null;
};

const MAX = 300;

export default function HistoryClient({ items }: { items: Item[] }) {
  const [editing, setEditing] = useState<Item | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function openEditor(item: Item) {
    setEditing(item);
    setText(item.content ?? "");
    setMessage(null);
  }

  function closeEditor() {
    setEditing(null);
    setText("");
    setMessage(null);
  }

  async function save() {
    if (!editing) return;
    if (!text.trim()) {
      setMessage("Please write something before saving.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      // Reutilizamos tu ruta existente:
      // PUT /api/journal/[date]  -> body: { content }
      const res = await fetch(`/api/journal/${editing.day}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err?.error || "Failed to save entry");
      }
      setMessage("Saved!");
      // Opcional: refrescar la página o mutar localmente
      setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }

  const list = useMemo(() => {
    return items.map((it) => ({
      ...it,
      preview:
        (it.content ?? "").length > 120
          ? (it.content ?? "").slice(0, 120) + "…"
          : it.content ?? "",
      prettyDate: new Date(it.day + "T00:00:00Z").toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    }));
  }, [items]);

  if (!items.length) {
    return (
      <p className="text-neutral-400">
        You don’t have any entries yet. Write your first line in <strong>Today</strong>.
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {list.map((it) => (
          <li
            key={it.id}
            className="rounded-xl border border-white/10 bg-neutral-900/60 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-widest text-neutral-400">
                  {it.prettyDate}
                </p>
                <p className="mt-1 text-neutral-100">{it.preview || <em className="text-neutral-400">No text</em>}</p>
              </div>
              <button
                onClick={() => openEditor(it)}
                className="rounded-md bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700"
              >
                Edit
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* Simple modal editor */}
      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-neutral-900 p-5 ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Edit entry</h2>
              <button
                onClick={closeEditor}
                className="rounded-md px-2 py-1 text-sm text-neutral-300 hover:bg-neutral-800"
              >
                Close
              </button>
            </div>

            <p className="mt-1 text-xs text-neutral-400">
              {new Date(editing.day + "T00:00:00Z").toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={MAX}
              rows={7}
              className="mt-4 w-full rounded-xl bg-neutral-800 p-3 outline-none"
              placeholder="Edit your line…"
            />

            <div className="mt-2 flex items-center justify-between">
              <span
                className={`text-sm ${
                  text.length === MAX ? "text-rose-400" : "text-neutral-400"
                }`}
              >
                {text.length}/{MAX}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={closeEditor}
                  className="rounded-md bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700"
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={busy || !text.trim()}
                  className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-40"
                >
                  {busy ? "Saving…" : "Save"}
                </button>
              </div>
            </div>

            {message && (
              <p className="mt-3 text-sm text-neutral-300">{message}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
