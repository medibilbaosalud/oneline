import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import TopNav from "./_components/TopNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OneLine",
  description: "A single honest line, every day.",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

import MobileNav from "@/components/MobileNav";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-black">
      <body className="bg-black text-zinc-100">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-neutral-950/80 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/60">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <div className="text-lg font-semibold">OneLine</div>
            {/* Desktop nav (si la tienes) */}
            <nav className="hidden gap-4 md:flex">
              {/* ...tus Links de desktop aquí... */}
            </nav>
            {/* Mobile nav */}
            <MobileNav />
          </div>
        </header>

        {children}
      </body>
    </html>
  );
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-neutral-950 text-neutral-50`}>
        {/* Barra superior de navegación (client component) */}
        <TopNav />
        {/* Contenido de cada página */}
        {children}
      </body>
    </html>
  );
}
