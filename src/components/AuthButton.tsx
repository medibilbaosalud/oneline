// src/components/AuthButton.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AuthButton() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/user", { cache: "no-store" });
        const j = await res.json();
        if (!alive) return;
        setEmail(j?.email ?? null);
      } catch {
        if (!alive) return;
        setEmail(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  async function handleSignOut() {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      // recargar estado UI
      setEmail(null);
      // opcional: volver al home
      window.location.href = "/";
    } catch {}
  }

  if (loading) {
    return (
      <div className="rounded-md px-3 py-2 text-sm text-zinc-300/70">
        …
      </div>
    );
  }

  if (email) {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-md bg-neutral-800 px-2 py-1 text-xs text-zinc-200">
          {email}
        </span>
        <button
          onClick={handleSignOut}
          className="rounded-md bg-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-white"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/auth"
      className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
    >
      Sign in
    </Link>
  );
}