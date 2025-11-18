'use client';

// SECURITY: Decrypts ciphertext entries locally; plaintext is never stored in React state until the vault is unlocked.

import { useEffect, useMemo, useState } from 'react';
import { decryptText, encryptText } from '@/lib/crypto';
import { useVault } from '@/hooks/useVault';
import { useEntryLimits } from '@/hooks/useEntryLimits';
import { ENTRY_LIMIT_BASE } from '@/lib/summaryPreferences';

type EntryPayload = {
  id: string;
  created_at: string;
  day?: string | null;
  content_cipher?: string | null;
  iv?: string | null;
  content?: string | null;
};

type DecryptedEntry = EntryPayload & {
  text: string;
  legacy: boolean;
  error?: string | null;
};

export default function HistoryClient({
  initialEntries,
  initialEntryLimit = ENTRY_LIMIT_BASE,
}: {
  initialEntries: EntryPayload[];
  initialEntryLimit?: number;
}) {
  const { entryLimit } = useEntryLimits({ entryLimit: initialEntryLimit });
  const { dataKey } = useVault();
  const [rawEntries, setRawEntries] = useState<EntryPayload[]>(initialEntries);
  const [items, setItems] = useState<DecryptedEntry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showEncryptedOnly, setShowEncryptedOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!dataKey) return () => {
      cancelled = true;
    };

    (async () => {
      const next: DecryptedEntry[] = [];
      for (const entry of rawEntries) {
        if (entry.content_cipher && entry.iv) {
          try {
            const text = await decryptText(dataKey, entry.content_cipher, entry.iv);
            if (!cancelled) {
              next.push({ ...entry, text, legacy: false, error: null });
            }
          } catch {
            if (!cancelled) {
              if (entry.content) {
                next.push({ ...entry, text: entry.content, legacy: true, error: 'Encrypted copy could not be unlocked. Re-save to encrypt with your current vault.' });
              } else {
                next.push({ ...entry, text: '', legacy: false, error: 'Could not decrypt this entry with the current passphrase.' });
              }
            }
          }
        } else if (entry.content) {
          next.push({ ...entry, text: entry.content, legacy: true, error: null });
        } else {
          next.push({ ...entry, text: '', legacy: false, error: null });
        }
      }
      if (!cancelled) setItems(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [dataKey, rawEntries]);

  const parseDayString = (value?: string | null): Date | null => {
    if (!value) return null;
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
      return null;
    }
    return new Date(year, month - 1, day);
  };

  const resolveEntryDate = (entry: DecryptedEntry) =>
    parseDayString(entry.day) ?? new Date(entry.created_at);

  const resolveEntryDateFromPayload = (entry: EntryPayload) =>
    parseDayString(entry.day) ?? new Date(entry.created_at);

  const sortedItems = useMemo(
    () =>
      [...items].sort(
        (a, b) => resolveEntryDate(b).valueOf() - resolveEntryDate(a).valueOf(),
      ),
    [items],
  );

  const encryptedOnlyList = useMemo(
    () =>
      [...rawEntries]
        .map((entry) => ({ ...entry, displayDate: resolveEntryDateFromPayload(entry) }))
        .sort((a, b) => a.displayDate.valueOf() - b.displayDate.valueOf())
        .reverse(),
    [rawEntries],
  );

  function fmtDate(entry: DecryptedEntry) {
    const d = resolveEntryDate(entry);
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  }

  function startEditing(entry: DecryptedEntry) {
    setEditingId(entry.id);
    setDraft(entry.text.slice(0, entryLimit));
  }

  function cancelEditing() {
    setEditingId(null);
    setDraft('');
  }

  async function saveEdit(entry: DecryptedEntry) {
    if (!dataKey) {
      alert('Unlock your vault before editing.');
      return;
    }
    const trimmed = draft.trim().slice(0, entryLimit);
    if (!trimmed) {
      alert('Entry cannot be empty.');
      return;
    }
    setSavingId(entry.id);
    try {
      const enc = await encryptText(dataKey, trimmed);
      const res = await fetch(`/api/history/${encodeURIComponent(entry.id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content_cipher: enc.cipher_b64, iv: enc.iv_b64 }),
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error('Could not update entry.');
      }
      setRawEntries((prev) =>
        prev.map((row) =>
          row.id === entry.id
            ? { ...row, content_cipher: enc.cipher_b64, iv: enc.iv_b64, content: '' }
            : row,
        ),
      );
      setEditingId(null);
      setDraft('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not update entry.');
    } finally {
      setSavingId(null);
    }
  }

  async function refreshFromServer() {
    try {
      const res = await fetch('/api/history', { cache: 'no-store' });
      if (!res.ok) return;
      const payload = await res.json().catch(() => null);
      const list = Array.isArray(payload?.entries) ? payload.entries : [];
      setRawEntries(list);
    } catch {
      // ignore network blips; UI already reflects optimistic state
    }
  }

  async function deleteEntry(entry: DecryptedEntry) {
    if (!confirm('Delete this entry? This action is permanent.')) return;
    setDeletingId(entry.id);
    const res = await fetch(`/api/history/${encodeURIComponent(entry.id)}`, {
      method: 'DELETE',
      cache: 'no-store',
    });
    if (!res.ok) {
      if (res.status === 404) {
        setRawEntries((prev) => prev.filter((row) => row.id !== entry.id));
        await refreshFromServer();
        setDeletingId(null);
        return;
      }
      const payload = await res.json().catch(() => null);
      alert(payload?.error ?? 'Could not delete entry.');
      setDeletingId(null);
      return;
    }
    setRawEntries((prev) => prev.filter((row) => row.id !== entry.id));
    await refreshFromServer();
    setDeletingId(null);
  }

  if (!dataKey && !showEncryptedOnly) {
    return (
      <div className="space-y-4 rounded-2xl border border-white/10 bg-zinc-900/70 p-6 text-sm text-zinc-100">
        <p className="text-base font-semibold text-white">History is locked</p>
        <p className="text-sm text-zinc-400">
          Your entries are stored as encrypted ciphertext in Supabase. Unlock your vault to decrypt them, or preview the locked
          list to confirm nothing readable ever leaves your device.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowEncryptedOnly(true)}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:border-indigo-300/60 hover:bg-indigo-500/10"
          >
            View encrypted list
          </button>
        </div>
      </div>
    );
  }

  if (!dataKey && showEncryptedOnly) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent p-5 text-sm text-zinc-200 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-white">Encrypted-only view</p>
              <p className="mt-1 text-sm text-zinc-400">
                Entries stay encrypted at rest. We surface only dates and truncated ciphertext so you can verify privacy without unlocking.
              </p>
            </div>
            <button
              onClick={() => setShowEncryptedOnly(false)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-neutral-100 transition hover:border-indigo-300/60 hover:bg-indigo-500/10"
            >
              Back to unlock prompt
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {encryptedOnlyList.map((entry) => (
            <article
              key={entry.id}
              className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 text-sm text-zinc-300"
            >
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.08em] text-indigo-200/70">
                <span>{resolveEntryDateFromPayload(entry).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-semibold text-emerald-200/80">Encrypted</span>
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                Ciphertext: {entry.content_cipher ? `${entry.content_cipher.slice(0, 32)}…` : 'No ciphertext stored'}
              </p>
            </article>
          ))}
        </div>
      </div>
    );
  }

  if (sortedItems.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6 text-zinc-400">
        No entries yet. Write your first OneLine today.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedItems.map((entry) => {
        const isEditing = editingId === entry.id;
        return (
          <article key={entry.id} className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5 shadow-sm">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-400">
              <span>{fmtDate(entry)}</span>
              {entry.legacy && (
                <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200">
                  Legacy — re-save to encrypt
                </span>
              )}
            </div>

            {entry.error && (
              <p className="mb-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {entry.error}
              </p>
            )}

            {!isEditing ? (
              <p className="whitespace-pre-wrap text-lg leading-relaxed text-zinc-100">{entry.text}</p>
            ) : (
              <textarea
                value={draft}
                onChange={(ev) => setDraft(ev.target.value.slice(0, entryLimit))}
                rows={4}
                maxLength={entryLimit}
                className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {!isEditing ? (
                <>
                  <button
                    onClick={() => startEditing(entry)}
                    className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-100 hover:bg-zinc-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteEntry(entry)}
                    disabled={deletingId === entry.id}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-60"
                  >
                    {deletingId === entry.id ? 'Deleting…' : 'Delete'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => saveEdit(entry)}
                    disabled={savingId === entry.id}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                  >
                    {savingId === entry.id ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="rounded-lg bg-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-100 hover:bg-zinc-600"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

// SECURITY WARNING: Editing or deleting entries requires the correct passphrase; losing it permanently locks the data.
