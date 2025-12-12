// src/app/layout.tsx
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import TopNav from '@/components/TopNav';
import Providers from './providers';
import { PwaRegister } from './pwa-register';
import { AuthSessionListener } from './_components/AuthSessionListener';
import InstallPrompt from '@/components/InstallPrompt';

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
          <InstallPrompt />
        </Providers>
        {/* Theme initialization - prevents flash of wrong theme */}
        <script dangerouslySetInnerHTML={{
          __html: `
          (function() {
            try {
              var t = localStorage.getItem('oneline-theme') || 'dark';
              var resolved = t === 'system' 
                ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
                : t;
              document.documentElement.setAttribute('data-theme', resolved);
            } catch(e) {}
          })();
        ` }} />
        <script dangerouslySetInnerHTML={{ __html: `console.log("VERSION: v2025-12-08-1048")` }} />
      </body>
    </html>
  );
}