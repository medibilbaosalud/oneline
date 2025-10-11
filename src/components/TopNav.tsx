'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import AuthButton from './AuthButton';

function NavLink({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname?.startsWith(href + '/');
  const base = 'rounded-md px-3 py-2 text-sm transition';
  return (
    <Link
      href={href}
      onClick={onClick}
      className={
        active
          ? `${base} bg-neutral-800 text-white`
          : `${base} text-neutral-300 hover:bg-neutral-800/60`
      }
    >
      {label}
    </Link>
  );
}

export default function TopNav() {
  const [open, setOpen] = useState(false);

  // Evita scroll del body con el menú abierto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <header
      className="
        sticky top-0 z-50
        border-b border-white/10
        bg-neutral-950/70 backdrop-blur
        supports-[backdrop-filter]:bg-neutral-950/60
      "
    >
      <nav className="mx-auto flex h-12 max-w-6xl items-center justify-between px-3">
        {/* Brand + Desktop nav */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="rounded-md px-2 py-1 text-sm font-semibold text-white hover:bg-neutral-800/60"
          >
            OneLine
          </Link>
          <div className="ml-2 hidden gap-1 md:flex">
            <NavLink href="/today" label="Today" />
            <NavLink href="/history" label="History" />
            <NavLink href="/summaries" label="Summaries" />
            <NavLink href="/settings" label="Settings" />
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

      {/* Mobile sheet */}
      {open && (
        <div className="fixed inset-0 z-[60] md:hidden">
          {/* Overlay con blur y oscurecido para que SIEMPRE se lea */}
          <div
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          {/* Panel */}
          <div
            className="
              absolute right-0 top-0 h-full w-[82%] max-w-sm
              bg-neutral-950/95 backdrop-blur-md
              ring-1 ring-white/10 shadow-2xl
            "
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-sm font-semibold text-white">OneLine</span>
              <button
                aria-label="Close menu"
                className="rounded-md p-2 text-zinc-200 hover:bg-neutral-800/60"
                onClick={() => setOpen(false)}
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

            <div className="flex flex-col gap-1 p-3">
              <NavLink href="/today" label="Today" onClick={() => setOpen(false)} />
              <NavLink href="/history" label="History" onClick={() => setOpen(false)} />
              <NavLink href="/summaries" label="Summaries" onClick={() => setOpen(false)} />
              <NavLink href="/settings" label="Settings" onClick={() => setOpen(false)} />
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