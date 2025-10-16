// src/components/AuthButton.tsx
"use client";

import { useEffect, useState } from "react";

export default function AuthButton() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await fetch("/api/auth/user", { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      setEmail(j?.email ?? null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const onVis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    setEmail(null);
    // Si prefieres refrescar: location.reload();
  }

  if (loading) {
    return (
      <button className="rounded-md bg-zinc-800 px-3 py-2 text-sm text-zinc-300 opacity-60">
        …
      </button>
    );
  }

  if (!email) {
    return (
      <a
        href="/auth" // tu página de login con email/contraseña
        className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
      >
        Sign in
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-sm text-zinc-300 md:inline">{email}</span>
      <button
        onClick={signOut}
        className="rounded-xl bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700"
      >
        Sign out
      </button>
    </div>
  );
}