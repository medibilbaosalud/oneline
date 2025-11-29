"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LegalConsentPage() {
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function accept() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/account/accept-consent", {
        method: "POST",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to save consent");
      }
      // Navigate back to Today after accepting
      router.replace("/today");
    } catch (e: any) {
      setErr(e.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto max-w-xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Consent required</h1>
        <p className="mt-2 text-zinc-400">
          To keep using OneLine, please confirm you’ve read and agree to our{" "}
          <Link href="/privacy" className="text-indigo-400 hover:underline">Privacy Policy</Link> and{" "}
          <Link href="/terms" className="text-indigo-400 hover:underline">Terms of Service</Link>.
        </p>

        <label className="mt-6 flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-indigo-500"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <span className="text-sm text-zinc-300">
            I have read and agree to the Privacy Policy and Terms of Service.
          </span>
        </label>

        {err && <p className="mt-3 text-sm text-rose-400">{err}</p>}

        <div className="mt-6 flex gap-3">
          <button
            disabled={!checked || busy}
            onClick={accept}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "Saving..." : "I agree"}
          </button>
          <Link href="/today" className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300">
            Cancel
          </Link>
        </div>
      </div>
    </main>
  );
}