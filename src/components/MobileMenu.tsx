'use client';

import Link from 'next/link';
import AuthButton from './AuthButton';

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
};

export default function MobileMenu({ open, onClose }: MobileMenuProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] md:hidden">
      {/* Overlay opaco */}
      <div
        className="absolute inset-0 bg-black"
        onClick={onClose}
        role="presentation"
      />
      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-[82%] max-w-sm bg-neutral-950 ring-1 ring-white/10">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="text-sm font-semibold text-white">OneLine</span>
          <button
            aria-label="Close menu"
            className="rounded-md p-2 text-zinc-200 hover:bg-neutral-800/60"
            onClick={onClose}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-1 p-3">
          <Link href="/today" className="rounded-md px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800/60" onClick={onClose}>
            Today
          </Link>
          <Link href="/history" className="rounded-md px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800/60" onClick={onClose}>
            History
          </Link>
          <Link href="/summaries" className="rounded-md px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800/60" onClick={onClose}>
            Summaries
          </Link>
          <Link href="/settings" className="rounded-md px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800/60" onClick={onClose}>
            Settings
          </Link>

          <div className="mt-2 border-t border-white/10 pt-2">
            <AuthButton />
          </div>
        </div>
      </div>
    </div>
  );
}