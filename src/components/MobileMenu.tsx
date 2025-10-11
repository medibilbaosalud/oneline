"use client";

import Link from "next/link";
import { useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function MobileMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const supabase = createClientComponentClient();

  // Bloquea scroll y cierra con ESC
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";

    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onEsc);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="absolute inset-x-0 top-0 rounded-b-2xl bg-neutral-950/95 p-5 ring-1 ring-white/10 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold text-white">OneLine</div>
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1 text-zinc-300 hover:bg-white/10"
            aria-label="Close menu"
          >
            Close
          </button>
        </div>

        <nav className="mt-4 grid gap-2 text-zinc-200">
          <Link
            href="/today"
            onClick={onClose}
            className="rounded-lg px-3 py-2 hover:bg-white/10"
          >
            Today
          </Link>
          <Link
            href="/history"
            onClick={onClose}
            className="rounded-lg px-3 py-2 hover:bg-white/10"
          >
            History
          </Link>
          <Link
            href="/summaries"
            onClick={onClose}
            className="rounded-lg px-3 py-2 hover:bg-white/10"
          >
            Summaries
          </Link>
          <Link
            href="/settings"
            onClick={onClose}
            className="rounded-lg px-3 py-2 hover:bg-white/10"
          >
            Settings
          </Link>

          <button
            onClick={async () => {
              await supabase.auth.signOut();
              onClose();
            }}
            className="mt-2 rounded-lg px-3 py-2 text-left text-red-300 hover:bg-red-500/10"
          >
            Sign out
          </button>
        </nav>
      </div>
    </div>
  );
}