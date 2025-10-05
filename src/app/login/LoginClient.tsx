// src/app/login/LoginClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const next = decodeURIComponent(params.get("next") || "/today");

  const supabase = createClientComponentClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si ya estás logueado, vete directo a "next"
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace(next);
    });
  }, [next, router, supabase]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setPending(false);

    if (error) {
      setError(error.message);
      return;
    }

    // 🔁 Redirección inmediata tras login correcto
    router.replace(next);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-md mx-auto">
      <div>
        <label className="block text-sm mb-1">Email</label>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded bg-neutral-800 px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="block text-sm mb-1">Password</label>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded bg-neutral-800 px-3 py-2"
          required
        />
      </div>

      {error && <p className="text-rose-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white hover:bg-indigo-400 disabled:opacity-40"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-center text-xs text-neutral-500 mt-2">
        You’ll be redirected back to <span className="font-medium">{next}</span> after auth.
      </p>
    </form>
  );
}
