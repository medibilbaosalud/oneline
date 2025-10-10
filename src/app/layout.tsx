// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";

export const metadata: Metadata = {
  title: "OneLine",
  description: "Capture one honest line a day.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-black">
      <body className="bg-black text-zinc-100">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-neutral-950/80 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/60">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/today" className="text-lg font-semibold text-white">
              OneLine
            </Link>

            {/* Navegación desktop */}
            <nav className="hidden gap-5 md:flex">
              <Link href="/today" className="text-zinc-300 hover:text-white">
                Today
              </Link>
              <Link href="/history" className="text-zinc-300 hover:text-white">
                History
              </Link>
              <Link href="/summaries" className="text-zinc-300 hover:text-white">
                Summaries
              </Link>
              <Link href="/settings" className="text-zinc-300 hover:text-white">
                Settings
              </Link>
            </nav>

            {/* Menú móvil */}
            <MobileNav />
          </div>
        </header>

        {children}
      </body>
    </html>
  );
}
