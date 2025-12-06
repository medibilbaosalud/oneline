// src/app/layout.tsx
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import TopNav from '@/components/TopNav';
import Providers from './providers';
import { PwaRegister } from './pwa-register';
import { AuthSessionListener } from './_components/AuthSessionListener';

const inter = Inter({ subsets: ['latin'] });

const themeColor = '#0ea5e9';

export const metadata: Metadata = {
  title: 'OneLine',
  description: 'One honest line a day.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'OneLine',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
      { url: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
    ],
    other: [
      { rel: 'mask-icon', url: '/icons/maskable-512.svg', type: 'image/svg+xml' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} min-h-screen app-shell`}>
        <Providers>
          <PwaRegister />
          <AuthSessionListener />
          {/* Global navigation across all pages */}
          <TopNav />
          {children}
          {/* DEBUG VERSION INDICATOR */}
          <div className="fixed bottom-1 right-1 z-50 rounded bg-red-600 px-2 py-1 text-[10px] font-bold text-white opacity-50 hover:opacity-100 pointer-events-none">
            v2025-12-06-FIX-DEPLOYED
          </div>
        </Providers>
        <script dangerouslySetInnerHTML={{ __html: `console.log("VERSION: v2025-12-06-FIX-DEPLOYED")` }} />
      </body>
    </html>
  );
}