// src/app/history/page.tsx
// SECURITY: Server delivers ciphertext metadata only; decryption happens inside the VaultGate client flow.

import { redirect } from 'next/navigation';

import VaultGate from '@/components/VaultGate';
import HistoryClient from './HistoryClient';
import { supabaseServer } from '@/lib/supabaseServer';
import {
  ENTRY_LIMIT_BASE,
  coerceSummaryPreferences,
  entryLimitFor,
} from '@/lib/summaryPreferences';

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

  if (!user) {
    redirect('/auth?next=/history');
  }

  const { data } = await sb
    .from('journal')
    .select('id, created_at, day, content_cipher, iv, content')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const entries: EntryPayload[] = data ?? [];

  let entryLimit = ENTRY_LIMIT_BASE;
  try {
    const { data: settingsRow, error } = await sb
      .from('user_vaults')
      .select('summary_preferences')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!error && settingsRow?.summary_preferences) {
      const prefs = coerceSummaryPreferences(settingsRow.summary_preferences);
      entryLimit = entryLimitFor(!!prefs.extendedGuidance);
    }
  } catch (error) {
    console.error('[history] entry_limit_fallback', error);
  }

  return (
    <main className="min-h-screen bg-[#0A0A0B] text-zinc-100">
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-semibold">History</h1>

        <VaultGate>
          {entries.length > 0 ? (
            <HistoryClient initialEntries={entries} initialEntryLimit={entryLimit} />
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
