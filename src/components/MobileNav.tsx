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

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => { document.documentElement.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <div className="md:hidden">
        <button
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="rounded-lg bg-white/10 px-3 py-2 text-sm text-zinc-100 hover:bg-white/20"
        >
          Menu
        </button>
      </div>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
            onClick={() => setOpen(false)}
          />
          <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-neutral-950 shadow-2xl md:hidden">
            <div className="flex items-center justify-between px-4 pt-[env(safe-area-inset-top)] pb-3">
              <span className="text-zinc-100 text-lg font-semibold">OneLine</span>
              <button
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-zinc-300 hover:bg-white/10"
              >
                ✕
              </button>
            </div>
            <ul className="px-2 pb-4">
              {links.map((l) => {
                const active = pathname === l.href;
                return (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className={[
                        "block rounded-lg px-3 py-3 text-base font-medium",
                        active
                          ? "bg-white/10 text-white"
                          : "text-zinc-300 hover:bg-white/10 hover:text-zinc-100",
                      ].join(" ")}
                    >
                      {l.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </>
      )}
    </>
  );
}