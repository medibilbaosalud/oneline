'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AuthButton from './AuthButton';

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active =
    pathname === href || (pathname?.startsWith(href + '/') ?? false);

  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-2 text-sm transition ${
        active
          ? 'bg-neutral-800 text-white'
          : 'text-neutral-300 hover:bg-neutral-800/60'
      }`}
    >
      {label}
    </Link>
  );
}

export default function TopNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-neutral-950/70 backdrop-blur">
      <nav className="mx-auto flex h-12 max-w-5xl items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="rounded-md px-2 py-1 text-sm font-semibold text-white hover:bg-neutral-800/60"
          >
            OneLine
          </Link>

          <div className="ml-2 hidden gap-1 sm:flex">
           <div className="ml-2 hidden gap-1 sm:flex">
           <NavLink href="/today" label="Today" />
           <NavLink href="/summaries" label="Summaries" />
           <NavLink href="/history" label="History" />   {/* ⬅︎ nuevo botón */}
           <NavLink href="/settings" label="Settings" />
</div>

            
          </div>
        </div>

        {/* Botón de autenticación (inicia sesión por email o cierra sesión) */}
        <AuthButton />
      </nav>
    </header>
  );
}

