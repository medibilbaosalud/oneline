// src/app/history/page.tsx
// SECURITY: Server delivers ciphertext metadata only; decryption happens inside the VaultGate client flow.

import VaultGate from '@/components/VaultGate';
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
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  let entries: EntryPayload[] = [];

  if (user) {
    const { data } = await sb
      .from('journal')
      .select('id, created_at, day, content_cipher, iv, content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    entries = data ?? [];
  }

  return (
    <main className="min-h-screen bg-[#0A0A0B] text-zinc-100">
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-semibold">History</h1>

        {!user && (
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
            Sign in to load your encrypted history. You can still explore the interface without logging in.
          </div>
        )}

        <VaultGate>
          {!user ? (
            <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6 text-zinc-400">
              Once you’re signed in and unlock your vault, your journal entries will appear here.
            </div>
          ) : entries.length > 0 ? (
            <HistoryClient initialEntries={entries} />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6 text-zinc-400">
              No entries yet.
            </div>
          )}
        </VaultGate>
      </div>
    </main>
  );
}

// SECURITY WARNING: Without the user’s passphrase, historical entries stay encrypted and unreadable.
