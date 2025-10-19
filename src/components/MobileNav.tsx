// src/components/MobileNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/today", label: "Today" },
  { href: "/history", label: "History" },
  { href: "/summaries", label: "Summaries" },
  { href: "/settings", label: "Settings" },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the sheet whenever the route changes
  useEffect(() => setOpen(false), [pathname]);

  // Prevent body scroll when the sheet is open
  useEffect(() => {
    const html = document.documentElement;
    if (open) html.style.overflow = "hidden";
    else html.style.overflow = "";
    return () => {
      html.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Trigger visible only on mobile */}
      <div className="md:hidden">
        <button
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="rounded-lg bg-white/10 px-3 py-2 text-sm text-zinc-100 hover:bg-white/20"
        >
          Menu
        </button>
      </div>

      {!open ? null : (
        <nav
  className={[
    // Fullscreen on top of everything
    "fixed inset-0 z-[9999] isolate",
    // Solid opaque background—no see-through, perfect legibility
    "bg-neutral-950",
    // Make the sheet itself scroll if content overflows
    "overflow-y-auto",
    // Respect iOS safe-areas
    "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
  ].join(" ")}
  role="dialog"
  aria-modal="true"
>
          <div className="mx-auto flex h-full max-w-xl flex-col px-4">
            {/* Top bar */}
            <div className="flex items-center justify-between py-3">
              <span className="text-zinc-100 text-lg font-semibold">OneLine</span>
              <button
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-zinc-300 hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {/* Primary call to action */}
            <div className="mt-3">
              <Link
                href="/today"
                className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-400 active:scale-[.99]"
              >
                Go to Today
              </Link>
            </div>

            {/* Navigation links */}
            <ul className="mt-6 space-y-1">
              {links.map((l) => {
                const active = pathname === l.href;
                return (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className={[
                        "block rounded-xl px-4 py-3 text-base",
                        active
                          ? "bg-white/12 text-white ring-1 ring-white/15"
                          : "text-zinc-300 hover:bg-white/10 hover:text-zinc-100",
                      ].join(" ")}
                    >
                      {l.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Optional badge/claim */}
            <div className="mt-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                Private • Fast • Addictive (in a good way)
              </div>
            </div>

            {/* Spacer to push footer content */}
            <div className="flex-1" />

            {/* Optional footer */}
            <div className="pb-4 pt-2 text-center text-xs text-zinc-500">
              © {new Date().getFullYear()} OneLine
            </div>
          </div>
        </nav>
      )}
    </>
  );
}