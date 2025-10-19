// src/app/login/LoginClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type Mode = "signin" | "signup";

export default function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const next = decodeURIComponent(params.get("next") || "/today");

  const supabase = createClientComponentClient();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // If already authenticated, redirect to the `next` route
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace(next);
    });
  }, [next, router, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(next); // Redirect immediately
      } else {
        // Sign Up
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // For setups without email confirmation we allow immediate entry.
        // If your project requires confirmation, show a message instead of redirecting now.
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          router.replace(next);
        } else {
          setInfo("Check your inbox to confirm your account.");
        }
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      {/* Card oscura */}
      <div className="rounded-2xl bg-neutral-900/70 p-6 ring-1 ring-white/10">
        {/* Tabs Sign in / Sign up */}
        <div className="mb-6 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`rounded-md px-3 py-1.5 text-sm ${
              mode === "signin"
                ? "bg-neutral-800 text-white"
                : "text-neutral-300 hover:bg-neutral-800/60"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded-md px-3 py-1.5 text-sm ${
              mode === "signup"
                ? "bg-neutral-800 text-white"
                : "text-neutral-300 hover:bg-neutral-800/60"
            }`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-neutral-300">Email</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-neutral-800 px-3 py-2 text-neutral-100 outline-none ring-1 ring-white/10 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-300">Password</label>
            <input
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-neutral-800 px-3 py-2 text-neutral-100 outline-none ring-1 ring-white/10 focus:ring-indigo-500"
              required
            />
          </div>

          {error && <p className="text-sm text-rose-400">{error}</p>}
          {info && <p className="text-sm text-emerald-400">{info}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white hover:bg-indigo-400 disabled:opacity-40"
          >
            {pending ? (mode === "signin" ? "Signing in…" : "Creating account…") : (mode === "signin" ? "Sign in" : "Create account")}
          </button>

          <p className="mt-2 text-center text-xs text-neutral-500">
            You’ll be redirected back to <span className="font-medium">{next}</span> after auth.
          </p>
        </form>
      </div>
    </div>
  );
}
