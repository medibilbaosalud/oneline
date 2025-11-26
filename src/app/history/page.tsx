// src/app/history/page.tsx
// SECURITY: Server delivers ciphertext metadata only; decryption happens inside the VaultGate client flow.

import { redirect } from 'next/navigation';

import VaultGate from '@/components/VaultGate';
import HistoryClient from './HistoryClient';
import SummaryHistory from './SummaryHistory';
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
        <header className="mb-6 space-y-3">
          <h1 className="text-3xl font-semibold">History</h1>
          <p className="text-sm text-zinc-400">
            Review your encrypted journal entries and keep a private archive of generated summaries. Both stay protected by your
            vault key.
          </p>
          <div className="flex flex-wrap gap-3 text-xs text-zinc-300">
            <a className="rounded-full border border-white/10 bg-white/5 px-3 py-1 hover:border-indigo-400 hover:text-white" href="#journal-history">
              Journal entries
            </a>
            <a className="rounded-full border border-white/10 bg-white/5 px-3 py-1 hover:border-indigo-400 hover:text-white" href="#summary-history">
              Summaries
            </a>
          </div>
        </header>

        <VaultGate>
          <div className="space-y-10">
            <section id="journal-history">
              {entries.length > 0 ? (
                <HistoryClient initialEntries={entries} initialEntryLimit={entryLimit} />
              ) : (
                <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6 text-zinc-400">
                  No entries yet.
                </div>
              )}
            </section>

            <SummaryHistory />
          </div>
        </VaultGate>
      </div>
    </main>
  );
}

// SECURITY WARNING: Without the user’s passphrase, historical entries stay encrypted and unreadable.
