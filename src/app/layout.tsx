// src/app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import TopNav from '@/components/TopNav';
import Providers from './providers';
import { PwaRegister } from './pwa-register';

const inter = Inter({ subsets: ['latin'] });

const themeColor = '#0ea5e9';

export const metadata: Metadata = {
  title: 'OneLine',
  description: 'One honest line a day.',
  manifest: '/manifest.webmanifest',
  themeColor,
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-neutral-950">
      <body
        className={`${inter.className} min-h-screen bg-neutral-950 text-zinc-100`}
        style={{ colorScheme: 'dark' }}
      >
        <Providers>
          <PwaRegister />
          {/* Global navigation across all pages */}
          <TopNav />
          {children}
        </Providers>
      </body>
    </html>
  );
}