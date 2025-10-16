'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AuthButton from './AuthButton';

export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  // Bloquear scroll cuando el menú esté abierto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden rounded-md px-3 py-1.5 text-sm font-medium text-zinc-200 ring-1 ring-white/10 hover:bg-neutral-800/60"
        aria-label="Open menu"
      >
        Menu
      </button>

      {open && (
        <div className="fixed inset-0 z-[120] md:hidden">
          {/* Fondo opaco */}
          <div
            className="absolute inset-0 bg-black"
            role="presentation"
            onClick={() => setOpen(false)}
          />

          {/* Sheet */}
          <div className="relative z-[121] h-full w-full max-w-md bg-neutral-950 text-zinc-100">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-sm font-semibold">OneLine</span>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-2 text-zinc-200 hover:bg-neutral-800/60"
                aria-label="Close menu"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 6l12 12M18 6l-12 12"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <nav className="flex flex-col gap-2 p-3">
              <Link
                href="/today"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm hover:bg-neutral-800/60"
              >
                Today
              </Link>
              <Link
                href="/history"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm hover:bg-neutral-800/60"
              >
                History
              </Link>
              <Link
                href="/summaries"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm hover:bg-neutral-800/60"
              >
                Summaries
              </Link>
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm hover:bg-neutral-800/60"
              >
                Settings
              </Link>

              <div className="mt-2 border-t border-white/10 pt-2">
                {/* Esto resuelve el “Sign in / Sign out” sin usar .auth en cliente */}
                <AuthButton />
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}