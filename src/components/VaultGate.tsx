// src/components/VaultGate.tsx
// SECURITY: Presents UI to unlock the client-side vault. Passphrases never leave the browser; losing them means permanent data loss.

'use client';

import { useEffect, useState } from 'react';
import { useVault } from '@/hooks/useVault';

export default function VaultGate({ children }: { children: React.ReactNode }) {
  const { dataKey, hasBundle, loading, createWithPassphrase, unlockWithPassphrase, vaultError, passphraseStored } = useVault();
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [remember, setRemember] = useState(true);
  const [rememberPassphrase, setRememberPassphrase] = useState(false);
  useEffect(() => {
    setRememberPassphrase(passphraseStored);
  }, [passphraseStored]);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-white/10 bg-neutral-950/60 text-neutral-400">
        Preparing secure vault…
      </div>
    );
  }

  if (dataKey) {
    return <>{children}</>;
  }

  async function handleSubmit() {
    const trimmed = passphrase.trim();
    if (!trimmed) {
      setFormError('Enter a passphrase.');
      return;
    }
    if (!hasBundle) {
      const confirmTrimmed = confirmPassphrase.trim();
      if (!confirmTrimmed) {
        setFormError('Confirm your passphrase.');
        return;
      }
      if (trimmed !== confirmTrimmed) {
        setFormError('Passphrases do not match. Use the exact same code twice.');
        return;
      }
    }
    setBusy(true);
    setFormError(null);
    try {
      if (hasBundle) {
        await unlockWithPassphrase(trimmed, rememberPassphrase);
      } else {
        await createWithPassphrase(trimmed, remember, rememberPassphrase);
      }
      setPassphrase('');
      setConfirmPassphrase('');
    } catch (err: unknown) {
      const fallback =
        'Decryption failed — the passphrase must match the exact code you set when you first encrypted your journal.';
      const message = err instanceof Error && err.message ? err.message : fallback;
      setFormError(hasBundle ? fallback : message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-neutral-950/70 p-6 shadow-xl backdrop-blur">
      <div className="space-y-4 text-sm text-neutral-300">
        <header className="space-y-1">
          <h2 className="text-xl font-semibold text-white">
            {hasBundle ? 'Unlock your encrypted journal' : 'Create your encrypted vault'}
          </h2>
          <p className="text-neutral-400">
            {hasBundle
              ? 'Enter the exact passphrase you created before. A different phrase will fail and your encrypted entries will remain unreadable.'
              : 'Choose a strong passphrase and type it twice to confirm. You must reuse this exact code every time you unlock OneLine.'}
          </p>
          {!hasBundle && (
            <p className="text-xs text-amber-300">
              Set it once and never change it — losing or altering this passphrase permanently locks all existing entries.
            </p>
          )}
          {!hasBundle && (
            <p className="text-xs text-neutral-400">
              Choose numbers that are easy to remember — something like your own phone number keeps the code memorable without sharing it.
            </p>
          )}
          {hasBundle && (
            <p className="text-xs text-amber-300">
              We never store your passphrase. If you forget it, we cannot recover or reset your data.
            </p>
          )}
        </header>

        {vaultError && (
          <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{vaultError}</p>
        )}

        <div className="space-y-3">
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wider text-neutral-500">Passphrase</span>
            <input
              type="password"
              value={passphrase}
              onChange={(event) => {
                setPassphrase(event.target.value);
              }}
              className="rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Enter a strong passphrase"
              autoComplete="current-password"
            />
          </label>

          {!hasBundle && (
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-wider text-neutral-500">Confirm passphrase</span>
              <input
                type="password"
                value={confirmPassphrase}
                onChange={(event) => setConfirmPassphrase(event.target.value)}
                className="rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                placeholder="Repeat your passphrase"
                autoComplete="new-password"
              />
            </label>
          )}

          {!hasBundle && (
            <label className="flex items-center gap-2 text-xs text-neutral-400">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-neutral-900"
              />
              Remember this device (stores an encrypted key in your browser)
            </label>
          )}

          <label className="flex items-center gap-2 text-xs text-neutral-400">
            <input
              type="checkbox"
              checked={rememberPassphrase}
              onChange={(event) => setRememberPassphrase(event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-neutral-900"
            />
            Auto-unlock on this device (stores your passphrase locally)
          </label>
          {rememberPassphrase && (
            <p className="text-xs text-amber-300">
              Only enable this on a trusted device. The passphrase stays on this browser to auto-unlock your vault.
            </p>
          )}

          {formError && <p className="text-sm text-rose-400">{formError}</p>}
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          {busy ? 'Working…' : hasBundle ? 'Unlock vault' : 'Create & continue'}
        </button>
        <p className="text-xs text-neutral-500">
          Tip: Prefer a long passphrase you can remember. Store it in a password manager — if it changes or is lost, the encrypted data stays locked forever.
        </p>
      </div>
    </div>
  );
}
