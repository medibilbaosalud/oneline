'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthButton from './AuthButton';

export default function SiteHeader() {
  const [open, setOpen] = useState(false);

  // Prevent body scroll when the menu is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <header className="sticky top-0 z-[100] border-b border-white/10 bg-neutral-950">
      <nav className="mx-auto flex h-12 max-w-6xl items-center justify-between px-3">
        {/* Brand + Desktop nav */}
        <div className="flex items-center gap-2">
          <Link href="/" className="rounded-md px-2 py-1 text-sm font-semibold text-white hover:bg-neutral-800/60">
            OneLine
          </Link>
          <div className="ml-2 hidden gap-1 md:flex">
            <Link href="/today" className="rounded-md px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800/60">Today</Link>
            <Link href="/history" className="rounded-md px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800/60">History</Link>
            <Link href="/summaries" className="rounded-md px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800/60">Summaries</Link>
            <Link href="/settings" className="rounded-md px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800/60">Settings</Link>
          </div>
        </div>

        {/* Auth (desktop) */}
        <div className="hidden md:flex">
          <AuthButton />
        </div>

        {/* Hamburger (mobile) */}
        <button
          aria-label="Open menu"
          className="md:hidden rounded-md px-3 py-1.5 text-sm font-medium text-zinc-200 ring-1 ring-white/10 hover:bg-neutral-800/60"
          onClick={() => setOpen(true)}
        >
          Menu
        </button>
      </nav>

      {/* Mobile sheet inline (sin componente aparte) */}
      {open && (
        <div className="fixed inset-0 z-[120] md:hidden">
          {/* Overlay opaco (no se ve el fondo) */}
          <div
            className="absolute inset-0 bg-black"
            onClick={() => setOpen(false)}
            role="presentation"
          />
          {/* Panel */}
          <div className="absolute right-0 top-0 h-full w-[82%] max-w-sm bg-neutral-950 ring-1 ring-white/10">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-sm font-semibold text-white">OneLine</span>
              <button
                aria-label="Close menu"
                className="rounded-md p-2 text-zinc-200 hover:bg-neutral-800/60"
                onClick={() => setOpen(false)}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-1 p-3">
              <Link href="/today" className="rounded-md px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800/60" onClick={() => setOpen(false)}>
                Today
              </Link>
              <Link href="/history" className="rounded-md px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800/60" onClick={() => setOpen(false)}>
                History
              </Link>
              <Link href="/summaries" className="rounded-md px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800/60" onClick={() => setOpen(false)}>
                Summaries
              </Link>
              <Link href="/settings" className="rounded-md px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800/60" onClick={() => setOpen(false)}>
                Settings
              </Link>
              <div className="mt-2 border-t border-white/10 pt-2">
                <AuthButton />
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}