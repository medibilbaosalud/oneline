// src/app/year-story/page.tsx
import { unstable_noStore as noStore } from 'next/cache';
import SessionGate from '@/components/auth/SessionGate';
import VaultGate from '@/components/vault/VaultGate';
import YearStoryClient from './YearStoryClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Year story — OneLine',
};

export default function YearStoryPage() {
  noStore();
  return (
    <SessionGate redirectBackTo="/year-story">
      <VaultGate>
        <YearStoryClient />
      </VaultGate>
    </SessionGate>
  );
}
