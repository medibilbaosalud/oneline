'use client';

// SECURITY: Decrypts ciphertext entries locally; plaintext is never stored in React state until the vault is unlocked.

import { useEffect, useMemo, useState } from 'react';
import { decryptText, encryptText } from '@/lib/crypto';
import { useVault } from '@/hooks/useVault';

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

export default function HistoryClient({ initialEntries }: { initialEntries: EntryPayload[] }) {
  const { dataKey, markDecryptionFailure } = useVault();
  const [rawEntries, setRawEntries] = useState<EntryPayload[]>(initialEntries);
  const [items, setItems] = useState<DecryptedEntry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

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
              markDecryptionFailure(
                'We could not decrypt your history. The passphrase must match the original code exactly — unlock again with that same phrase.',
              );
            }
            return;
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

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => new Date(b.created_at).valueOf() - new Date(a.created_at).valueOf()),
    [items],
  );

  function fmtDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  }

  function startEditing(entry: DecryptedEntry) {
    setEditingId(entry.id);
    setDraft(entry.text);
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
    const trimmed = draft.trim();
    if (!trimmed) {
      alert('Entry cannot be empty.');
      return;
    }
    setSavingId(entry.id);
    try {
      const enc = await encryptText(dataKey, trimmed);
      const res = await fetch(`/api/history/${entry.id}`, {
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

  async function deleteEntry(entry: DecryptedEntry) {
    if (!confirm('Delete this entry? This action is permanent.')) return;
    const res = await fetch(`/api/history/${entry.id}`, { method: 'DELETE', cache: 'no-store' });
    if (!res.ok) {
      alert('Could not delete entry.');
      return;
    }
    setRawEntries((prev) => prev.filter((row) => row.id !== entry.id));
  }

  if (!dataKey) {
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6 text-sm text-zinc-400">
        Unlock your vault to view history.
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
              <span>{fmtDate(entry.created_at)}</span>
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
                onChange={(ev) => setDraft(ev.target.value)}
                rows={4}
                maxLength={300}
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
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-500"
                  >
                    Delete
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
