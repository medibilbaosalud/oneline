"use client";

import { useState } from "react";
import Link from "next/link";
import MobileMenu from "./MobileMenu";

export default function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-neutral-950/60 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/60">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold text-white">
          OneLine
        </Link>

        <div className="flex items-center gap-3">
          {/* CTA visible en móvil y desktop */}
          <Link
            href="/today"
            className="hidden sm:inline-flex rounded-full bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500"
          >
            Go to Today
          </Link>

          {/* Botón Menu solo móvil (puedes dejarlo también en desktop si quieres) */}
          <button
            onClick={() => setOpen(true)}
            className="inline-flex rounded-md bg-white/10 px-4 py-2 text-zinc-200 hover:bg-white/20 sm:hidden"
          >
            Menu
          </button>
        </div>
      </div>

      {/* Panel móvil */}
      <MobileMenu open={open} onClose={() => setOpen(false)} />
    </header>
  );
}