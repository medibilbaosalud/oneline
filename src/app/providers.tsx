"use client";

import { SessionProvider } from 'next-auth/react';
import SupabaseSessionBridge from '@/app/components/SupabaseSessionBridge';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SupabaseSessionBridge />
      {children}
    </SessionProvider>
  );
}
