'use client';

import Link from 'next/link';
import AuthButton from './AuthButton';
import MobileMenu from './MobileMenu';

function NavLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800/60"
    >
      {label}
    </Link>
  );
}

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-[100] border-b border-white/10 bg-neutral-950">
      <nav className="mx-auto flex h-12 max-w-6xl items-center justify-between px-3">
        {/* Marca + nav escritorio */}
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

        {/* Auth en escritorio */}
        <div className="hidden md:flex">
          <AuthButton />
        </div>

        {/* Menú móvil (se autogestiona, NO props) */}
        <div className="md:hidden">
          <MobileMenu />
        </div>
      </nav>
    </header>
  );
}