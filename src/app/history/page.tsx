// src/app/history/page.tsx
// SECURITY: Server delivers ciphertext metadata only; decryption happens inside the VaultGate client flow.

import { unstable_noStore as noStore } from 'next/cache';
import SessionGate from '@/components/auth/SessionGate';
import VaultGate from '@/components/vault/VaultGate';
import HistoryClient from './HistoryClient';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'History — OneLine',
};

type EntryPayload = {
  id: string;
  created_at: string;
  day?: string | null;
  content_cipher?: string | null;
  iv?: string | null;
  content?: string | null;
};

export default async function HistoryPage() {
  noStore();
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  const entries: EntryPayload[] = user
    ? (
        (await sb
          .from('journal')
          .select('id, created_at, day, content_cipher, iv, content')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })).data ?? []
      )
    : [];

  return (
    <SessionGate redirectBackTo="/history">
      <VaultGate>
        <main className="min-h-screen bg-[#0A0A0B] text-zinc-100">
          <div className="mx-auto w-full max-w-3xl px-4 py-8">
            <h1 className="mb-6 text-3xl font-semibold">History</h1>

            {entries.length > 0 ? (
              <HistoryClient initialEntries={entries} />
            ) : (
              <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6 text-zinc-400">
                No entries yet.
              </div>
            )}
          </div>
        </main>
      </VaultGate>
    </SessionGate>
  );
}

// SECURITY WARNING: Without the user’s passphrase, historical entries stay encrypted and unreadable.
