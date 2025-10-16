"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function AuthButton() {
  const [email, setEmail] = useState<string | null>(null);

  async function refreshUser() {
    try {
      const res = await fetch("/api/auth/user", { cache: "no-store" });
      const j = await res.json();
      setEmail(j?.email ?? null);
    } catch {
      setEmail(null);
    }
  }

  useEffect(() => { refreshUser(); }, []);

  if (!email) {
    return (
      <Link
        href="/auth"
        className="rounded-lg bg-indigo-600/90 px-4 py-2 text-white hover:bg-indigo-500"
      >
        Sign in
      </Link>
    );
  }

  return (
    <button
      onClick={async () => {
        await fetch("/api/auth/signout", { method: "POST" });
        location.href = "/"; // limpio y forzado
      }}
      className="rounded-lg bg-neutral-800 px-3 py-2 text-sm text-white hover:bg-neutral-700"
      title={email}
    >
      Sign out
    </button>
  );
}