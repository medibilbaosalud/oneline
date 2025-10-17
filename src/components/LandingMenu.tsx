'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import AuthButton from './AuthButton';

export default function LandingMenu() {
  const [open, setOpen] = useState(false);

  // Prevent body scroll when the overlay menu is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setOpen(true)}
        className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-200 ring-1 ring-white/10 hover:bg-white/10 md:hidden"
        aria-label="Open menu"
      >
        Menu
      </button>

      {/* Mobile sheet */}
      {open && (
        <div className="fixed inset-0 z-[60] md:hidden">
          {/* Overlay  */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          {/* Panel */}
          <div className="absolute right-0 top-0 h-full w-[82%] max-w-sm bg-neutral-950 ring-1 ring-white/10">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-sm font-semibold text-white">OneLine</span>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-2 text-zinc-200 hover:bg-neutral-800/60"
                aria-label="Close menu"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-1 p-3">
              <Link href="/today"     onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800/60">Today</Link>
              <Link href="/history"   onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800/60">History</Link>
              <Link href="/summaries" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800/60">Summaries</Link>
              <Link href="/settings"  onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800/60">Settings</Link>

              <div className="mt-2 border-t border-white/10 pt-2">
                <AuthButton />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}