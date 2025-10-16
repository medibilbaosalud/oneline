"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const res = await fetch("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, mode }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setErr(json?.error || "Failed");
      return;
    }
    router.push("/today");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 text-xl font-semibold text-white">
        {mode === "signin" ? "Sign in" : "Create account"}
      </h1>

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="w-full rounded-md bg-neutral-900 px-3 py-2 text-white"
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full rounded-md bg-neutral-900 px-3 py-2 text-white"
          type="password"
          placeholder="Password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {err && <p className="text-sm text-rose-400">{err}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {loading ? "Working…" : mode === "signin" ? "Sign in" : "Sign up"}
        </button>
      </form>

      <button
        className="mt-3 text-xs text-zinc-400 underline"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
      >
        Switch to {mode === "signin" ? "sign up" : "sign in"}
      </button>

      <p className="mt-6 text-xs text-zinc-500">
        By continuing you agree to our{" "}
        <a className="underline" href="/terms">Terms</a> and{" "}
        <a className="underline" href="/privacy">Privacy Policy</a>.
      </p>
    </div>
  );
}