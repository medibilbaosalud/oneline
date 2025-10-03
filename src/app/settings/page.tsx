"use client";

import { useEffect, useState } from "react";

type Freq = "weekly" | "monthly" | "yearly";

export default function SettingsPage() {
  const [frequency, setFrequency] = useState<Freq>("weekly");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/settings");
      const json = await res.json();
      setFrequency((json.frequency ?? "weekly") as Freq);
    })();
  }, []);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ frequency })
      });
      if (!res.ok) throw new Error("Failed to save");
      setMsg("Saved ✔");
    } catch (e: any) {
      setMsg(e.message || "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50">
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="mb-4 text-2xl font-semibold">Settings</h1>

        <div className="rounded-xl bg-neutral-900/60 p-5 ring-1 ring-white/10">
          <label className="block text-sm text-neutral-400 mb-2">
            Summary frequency
          </label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as Freq)}
            className="bg-neutral-900 ring-1 ring-white/10 rounded-md p-2 outline-none"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>

          <div className="mt-4">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-md bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-400 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>

          {msg && <p className="mt-3 text-sm text-neutral-400">{msg}</p>}
        </div>

        <p className="mt-6 text-sm text-neutral-500">
          For now, summaries are delivered inside the app (no email yet).
        </p>
      </div>
    </main>
  );
}
