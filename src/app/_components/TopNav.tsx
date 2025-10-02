'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/today', label: 'Today' },
  { href: '/summaries', label: 'Summaries' },
  { href: '/settings', label: 'Settings' },
];

export default function TopNav() {
  const pathname = usePathname() ?? '/';

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
        <Link
          href="/today"
          className="mr-2 rounded-md px-2 py-1 text-sm font-semibold text-neutral-200 hover:bg-white/5"
        >
          OneLine
        </Link>

        <nav className="flex items-center gap-1">
          {links.map((l) => {
            const active =
              pathname === l.href ||
              (l.href !== '/' && pathname.startsWith(l.href + '/'));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={[
                  'rounded-md px-3 py-1.5 text-sm transition-colors',
                  active
                    ? 'bg-white/10 text-white'
                    : 'text-neutral-400 hover:bg-white/5 hover:text-white',
                ].join(' ')}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
