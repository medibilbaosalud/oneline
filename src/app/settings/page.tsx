"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Frequency = "weekly" | "monthly" | "yearly";

type SettingsResponse = {
  ok: boolean;
  settings?: {
    frequency: Frequency;
  };
};

function messageFromError(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

export default function SettingsPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const router = useRouter();
  const [frequency, setFrequency] = useState<Frequency>("weekly");
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [lastSignIn, setLastSignIn] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [sessionRes, settingsRes] = await Promise.all([
          supabase.auth.getSession(),
          fetch("/api/settings", { cache: "no-store" }),
        ]);

        if (cancelled) return;

        const session = sessionRes.data.session;
        setEmail(session?.user?.email ?? null);
        setLastSignIn(session?.user?.last_sign_in_at ?? null);

        if (settingsRes.ok) {
          const json = (await settingsRes.json()) as SettingsResponse;
          if (json.ok && json.settings) {
            setFrequency(json.settings.frequency ?? "weekly");
          }
        } else if (settingsRes.status === 401) {
          setError("You need to sign in to manage your settings.");
        } else {
          const json = await settingsRes.json().catch(() => null);
          setError(json?.error || "Unable to load your settings right now.");
        }
      } catch (err: unknown) {
        if (!cancelled) setError(messageFromError(err, "Unable to load your settings right now."));
      } finally {
        if (!cancelled) setSettingsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function handleSaveFrequency(nextFrequency: Frequency) {
    setSaving(true);
    setFeedback(null);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frequency: nextFrequency }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Could not update your preferences.");
      }

      setFrequency(nextFrequency);
      setFeedback("Saved.");
    } catch (err: unknown) {
      setError(messageFromError(err, "Could not update your preferences."));
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    setFeedback(null);
    setError(null);
    try {
      const res = await fetch("/api/account/export", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Export failed");
      }

      const blob = new Blob([JSON.stringify(json.entries ?? [], null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "oneline-export.json";
      a.click();
      URL.revokeObjectURL(url);
      setFeedback("Export ready. Check your downloads.");
    } catch (err: unknown) {
      setError(messageFromError(err, "Export failed"));
    }
  }

  async function handleDeleteAccount() {
    setFeedback(null);
    setError(null);
    const confirmation = window.prompt(
      "Type DELETE to confirm that you want to remove your journal entries and sign out.",
    );
    if (confirmation !== "DELETE") return;

    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Delete failed");
      }

      await supabase.auth.signOut();
      router.push("/auth");
      router.refresh();
    } catch (err: unknown) {
      setError(messageFromError(err, "Delete failed"));
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/auth");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <header className="max-w-2xl space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-indigo-300/80">Account</p>
          <h1 className="text-3xl font-semibold md:text-4xl">Settings & safeguards</h1>
          <p className="text-sm text-neutral-400 md:text-base">
            Adjust how often you receive summaries, export your data, and keep your account secure. Everything is private
            by design.
          </p>
        </header>

        <div className="mt-8 space-y-6">
          <section className="rounded-3xl border border-white/10 bg-neutral-900/60 p-6 shadow-lg shadow-black/20">
            <h2 className="text-lg font-semibold text-neutral-100">Profile</h2>
            {settingsLoading ? (
              <p className="mt-3 text-sm text-neutral-400">Loading your account…</p>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                  <p className="text-sm text-neutral-500">Signed in as</p>
                  <p className="truncate text-base font-medium text-neutral-100">{email ?? "Unknown"}</p>
                  {lastSignIn && (
                    <p className="mt-1 text-xs text-neutral-500">Last sign-in: {new Date(lastSignIn).toLocaleString()}</p>
                  )}
                </div>
                <button
                  onClick={handleSignOut}
                  className="self-start rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:bg-white/10"
                >
                  Sign out
                </button>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-neutral-900/60 p-6 shadow-lg shadow-black/20">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-neutral-100">Email summaries</h2>
                <p className="text-sm text-neutral-400">
                  Choose how often OneLine should compile your recent entries into an email-ready summary.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={frequency}
                  disabled={settingsLoading || saving}
                  onChange={(e) => setFrequency(e.target.value as Frequency)}
                  className="rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="weekly">Weekly digest</option>
                  <option value="monthly">Monthly recap</option>
                  <option value="yearly">Yearly report</option>
                </select>
                <button
                  onClick={() => handleSaveFrequency(frequency)}
                  disabled={settingsLoading || saving}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-neutral-300">
              <p className="font-medium text-neutral-100">New Year automation</p>
              <p className="mt-2 text-neutral-400">
                Every 1 January (Madrid time) we automatically generate a &ldquo;Year in review&rdquo; story for the previous year and
                file it under your summaries. You can always tweak or regenerate it manually from the Year Story tool.
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-neutral-900/60 p-6 shadow-lg shadow-black/20">
            <h2 className="text-lg font-semibold text-neutral-100">Data control</h2>
            <p className="mt-2 text-sm text-neutral-400">
              Download a full copy of your entries or remove everything. Exports are delivered instantly as JSON.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={handleExport}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-neutral-100 transition hover:bg-white/10"
              >
                Export journal (.json)
              </button>
              <button
                onClick={handleDeleteAccount}
                className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20"
              >
                Permanently delete entries
              </button>
            </div>
          </section>

          {(feedback || error) && (
            <div className="rounded-3xl border border-white/10 bg-neutral-900/80 p-4 text-sm">
              {feedback && <p className="text-emerald-400">{feedback}</p>}
              {error && <p className="text-rose-400">{error}</p>}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
