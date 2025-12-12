'use client';

// SECURITY: Decrypts ciphertext entries locally; plaintext is never stored in React state until the vault is unlocked.

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [reloading, setReloading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!dataKey) return;
    let active = true;
    setReloading(true);
    setLoadError(null);
    fetch('/api/history', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json: { entries?: EntryPayload[]; error?: string }) => {
        if (!active) return;
        if (json.error) {
          setLoadError(json.error);
          return;
        }
        if (json.entries) setRawEntries(json.entries);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setLoadError(err instanceof Error ? err.message : 'Unable to load history.');
      })
      .finally(() => {
        if (active) setReloading(false);
      });

    return () => {
      active = false;
    };
  }, [dataKey]);

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

  if (loadError) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-100">
        {loadError}
      </div>
    );
  }

  if (showEncryptedOnly) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent p-5 text-sm text-zinc-200 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-base font-semibold text-white">Encrypted-only view</p>
              <p className="text-sm text-zinc-400">
                This mode mirrors what the servers see: timestamps plus ciphertext. Plaintext never leaves your device, even when the vault is unlocked.
              </p>
            </div>
            <button
              onClick={() => setShowEncryptedOnly(false)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-neutral-100 transition hover:border-indigo-300/60 hover:bg-indigo-500/10"
            >
              {dataKey ? 'Return to decrypted view' : 'Back to unlock prompt'}
            </button>
          </div>
        </div>

        {encryptedOnlyList.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6 text-sm text-zinc-400">
            No entries yet. Write your first OneLine today.
          </div>
        ) : (
          <div className="space-y-3">
            {encryptedOnlyList.map((entry) => (
              <article
                key={entry.id}
                className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 text-sm text-zinc-300"
              >
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.08em] text-indigo-200/70">
                  <span>
                    {resolveEntryDateFromPayload(entry).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-semibold text-emerald-200/80">Encrypted</span>
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  Ciphertext: {entry.content_cipher ? `${entry.content_cipher.slice(0, 32)}…` : 'No ciphertext stored'}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    );
  }

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

  if (sortedItems.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6 text-zinc-400">
        No entries yet. Write your first OneLine today.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Privacy Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-transparent px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔐</span>
          <div>
            <p className="text-sm font-semibold text-white">Private by design</p>
            <p className="text-xs text-emerald-200/60">Only you can read your entries. Servers see ciphertext only.</p>
          </div>
        </div>
        <button
          onClick={() => setShowEncryptedOnly(true)}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-neutral-200 transition hover:bg-white/10"
        >
          View encrypted
        </button>
      </div>

      {reloading && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-200"
        >
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="h-4 w-4 rounded-full border-2 border-indigo-400 border-t-transparent"
          />
          Syncing your entries…
        </motion.div>
      )}

      {/* Timeline of entries */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-indigo-500/50 via-purple-500/30 to-transparent" />

        <AnimatePresence>
          {sortedItems.map((entry, index) => {
            const isEditing = editingId === entry.id;
            return (
              <motion.article
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative pl-14 pb-6"
              >
                {/* Timeline dot */}
                <div className="absolute left-[1.15rem] top-7 flex h-4 w-4 items-center justify-center z-10">
                  <div className={`h-2.5 w-2.5 rounded-full ring-4 ring-neutral-950 ${entry.error ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : entry.legacy ? 'bg-amber-500' : 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]'}`} />
                </div>

                {/* Entry card */}
                <div className={`group rounded-3xl border p-6 transition-all duration-300 ${isEditing
                  ? 'border-indigo-500/50 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
                  : entry.error
                    ? 'border-rose-500/30 bg-rose-500/5'
                    : 'border-white/5 bg-white/5 backdrop-blur-md hover:border-white/10 hover:shadow-xl hover:translate-x-1 hover:bg-white/[0.07]'
                  }`}>
                  {/* Header */}
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{fmtDate(entry)}</span>
                      {entry.legacy && (
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                          Unencrypted
                        </span>
                      )}
                    </div>
                    {!entry.error && !entry.legacy && (
                      <span className="text-xs text-emerald-400/70">🔒 Encrypted</span>
                    )}
                  </div>

                  {/* Error message */}
                  {entry.error && (
                    <div className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                      ⚠️ {entry.error}
                    </div>
                  )}

                  {/* Content */}
                  {!isEditing ? (
                    <p className="whitespace-pre-wrap text-base leading-relaxed text-neutral-100">
                      {entry.text || <span className="italic text-neutral-500">No content available</span>}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        value={draft}
                        onChange={(ev) => setDraft(ev.target.value.slice(0, entryLimit))}
                        rows={4}
                        maxLength={entryLimit}
                        className="w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-neutral-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        autoFocus
                      />
                      <div className="text-right text-xs text-neutral-500">
                        {draft.length}/{entryLimit}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {!isEditing ? (
                      <>
                        <button
                          onClick={() => startEditing(entry)}
                          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-neutral-200 transition hover:bg-white/10"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => deleteEntry(entry)}
                          disabled={deletingId === entry.id}
                          className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
                        >
                          {deletingId === entry.id ? '⏳ Deleting…' : '🗑️ Delete'}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => saveEdit(entry)}
                          disabled={savingId === entry.id}
                          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                        >
                          {savingId === entry.id ? '⏳ Saving…' : '✓ Save'}
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-neutral-200 transition hover:bg-white/10"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

// SECURITY WARNING: Editing or deleting entries requires the correct passphrase; losing it permanently locks the data.
