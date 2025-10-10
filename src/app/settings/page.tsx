"use client";

import { useEffect, useState } from "react";

type Freq = "weekly" | "monthly" | "yearly";

// src/app/settings/page.tsx (fragmento)
"use client";
import { useState } from "react";

export default function SettingsPage() {
  const [confirm, setConfirm] = useState("");

  async function exportData() {
    const res = await fetch("/api/account/export");
    const json = await res.json();
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "oneline-export.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function deleteAccount() {
    if (!confirm || confirm !== "DELETE") return alert('Type DELETE to confirm');
    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirm }),
    });
    if (res.ok) {
      alert("Your account was deleted.");
      window.location.href = "/";
    } else {
      const j = await res.json().catch(()=>({}));
      alert(j?.error || "Error deleting account");
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <div className="mt-8 rounded-xl border border-white/10 p-5">
        <h2 className="text-lg font-medium">Your data</h2>
        <p className="mt-2 text-sm text-zinc-400">Export or delete your account.</p>

        <div className="mt-4 flex gap-3">
          <button onClick={exportData} className="rounded-md bg-white/10 px-3 py-2 hover:bg-white/20">
            Export JSON
          </button>
        </div>

        <div className="mt-6">
          <label className="text-sm text-zinc-400">Type <b>DELETE</b> to confirm:</label>
          <input
            value={confirm} onChange={e=>setConfirm(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm focus:outline-none"
            placeholder="DELETE"
          />
          <button
            onClick={deleteAccount}
            className="mt-3 rounded-md bg-red-600 px-3 py-2 text-white hover:bg-red-700"
          >
            Delete my account
          </button>
        </div>
      </div>
    </main>
  );
}

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
