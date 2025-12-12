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
    <main className="min-h-screen bg-neutral-950 text-zinc-100">
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        {/* Hero Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-2xl">
              📜
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-indigo-400">Your Archive</p>
              <h1 className="text-3xl font-bold text-white">History</h1>
            </div>
          </div>
          <p className="text-neutral-400 max-w-xl">
            Your encrypted journal entries and generated stories. Everything stays protected by your vault key.
          </p>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl border border-white/10 bg-neutral-900/60 p-4 text-center">
            <p className="text-3xl font-bold text-white">{entries.length}</p>
            <p className="text-xs text-neutral-500">Total entries</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-neutral-900/60 p-4 text-center">
            <p className="text-3xl font-bold text-emerald-400">🔒</p>
            <p className="text-xs text-neutral-500">E2E Encrypted</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-neutral-900/60 p-4 text-center">
            <p className="text-3xl font-bold text-white">
              {entries.length > 0 ? new Date(entries[entries.length - 1].created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
            </p>
            <p className="text-xs text-neutral-500">First entry</p>
          </div>
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-center">
            <p className="text-3xl font-bold text-indigo-300">{entryLimit}</p>
            <p className="text-xs text-indigo-200/60">Char limit</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <a
            href="#journal-history"
            className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300 transition hover:bg-indigo-500/20"
          >
            📝 Journal Entries
          </a>
          <a
            href="#summary-history"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:bg-white/10"
          >
            📖 Stories
          </a>
        </div>

        <VaultGate>
          <div className="space-y-12">
            <section id="journal-history">
              {entries.length > 0 ? (
                <HistoryClient initialEntries={entries} initialEntryLimit={entryLimit} />
              ) : (
                <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-8 text-center">
                  <span className="text-5xl">✨</span>
                  <h3 className="mt-4 text-lg font-semibold text-white">No entries yet</h3>
                  <p className="mt-2 text-neutral-400">Start writing daily to build your personal archive.</p>
                  <a
                    href="/today"
                    className="mt-4 inline-block rounded-xl bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                  >
                    Write your first entry
                  </a>
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

// SECURITY WARNING: Without the user's passphrase, historical entries stay encrypted and unreadable.
