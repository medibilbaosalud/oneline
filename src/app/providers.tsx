"use client";

import { SessionProvider } from 'next-auth/react';

import SupabaseSessionSynchronizer from '@/app/components/SupabaseSessionSynchronizer';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SupabaseSessionSynchronizer />
      {children}
    </SessionProvider>
  );
}
