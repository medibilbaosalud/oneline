// src/components/VaultGate.tsx
// SECURITY: Presents UI to unlock the client-side vault. Passphrases never leave the browser; losing them means permanent data loss.

'use client';

import { useEffect, useState } from 'react';
import { useVault } from '@/hooks/useVault';
import { clearStoredPassphrase, getStoredPassphrase } from '@/lib/passphraseStorage';

export default function VaultGate({ children }: { children: React.ReactNode }) {
  const {
    dataKey,
    hasBundle,
    loading,
    createWithPassphrase,
    unlockWithPassphrase,
    vaultError,
    hasStoredPassphrase,
    requestNoVaultOverride,
    clearNoVaultOverride,
    manualCreationOverride,
  } = useVault();
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [remember, setRemember] = useState(true);
  const [rememberPassphrase, setRememberPassphrase] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [manualCreate, setManualCreate] = useState(false);
  const [manualCheckError, setManualCheckError] = useState<string | null>(null);
  const [checkingManual, setCheckingManual] = useState(false);
  const effectiveHasBundle = hasBundle && !manualCreate;

  useEffect(() => {
    setRememberPassphrase(hasStoredPassphrase);
  }, [hasStoredPassphrase]);

  useEffect(() => {
    const stored = getStoredPassphrase();
    if (stored) {
      setPassphrase(stored);
      setConfirmPassphrase(stored);
      setRememberPassphrase(true);
    }
  }, []);

  useEffect(() => {
    setManualCreate(manualCreationOverride);
  }, [manualCreationOverride]);

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
    if (!effectiveHasBundle) {
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
      if (effectiveHasBundle) {
        await unlockWithPassphrase(trimmed, { rememberPassphrase });
      } else {
        await createWithPassphrase(trimmed, remember, rememberPassphrase);
      }
      setPassphrase('');
      setConfirmPassphrase('');
      if (!rememberPassphrase) {
        clearStoredPassphrase();
      }
    } catch (err: unknown) {
      const fallback =
        'Decryption failed — the passphrase must match the exact code you set when you first encrypted your journal.';
      const message = err instanceof Error && err.message ? err.message : fallback;
      setFormError(effectiveHasBundle ? fallback : message);
    } finally {
      setBusy(false);
    }
  }

  async function handleManualOverride() {
    setCheckingManual(true);
    setManualCheckError(null);
    try {
      const allowed = await requestNoVaultOverride();
      if (allowed) {
        setManualCreate(true);
      } else {
        setManualCreate(false);
        setManualCheckError(
          vaultError ??
            'We detected previous activity for this account. Unlock with your existing passphrase instead of creating a new one.',
        );
      }
    } catch (error) {
      const fallback = 'We could not verify your vault status right now. Try again or unlock with your existing passphrase.';
      const message = error instanceof Error && error.message ? error.message : fallback;
      setManualCheckError(message);
      setManualCreate(false);
    } finally {
      setCheckingManual(false);
    }
  }

  function handleReturnToUnlock() {
    setManualCreate(false);
    clearNoVaultOverride();
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-neutral-950/70 p-6 shadow-xl backdrop-blur">
      <div className="space-y-4 text-sm text-neutral-300">
        <header className="space-y-1">
          <h2 className="text-xl font-semibold text-white">
            {effectiveHasBundle ? 'Unlock your encrypted journal' : 'Create your encrypted vault'}
          </h2>
          <p className="text-neutral-400">
            {effectiveHasBundle
              ? 'Enter the exact passphrase you created before. A different phrase will fail and your encrypted entries will remain unreadable.'
              : 'Choose a strong passphrase and type it twice to confirm. You must reuse this exact code every time you unlock OneLine.'}
          </p>
          {!effectiveHasBundle && (
            <p className="text-xs text-amber-300">
              Set it once and never change it — losing or altering this passphrase permanently locks all existing entries.
            </p>
          )}
          {!effectiveHasBundle && (
            <p className="text-xs text-neutral-400">
              Choose numbers that are easy to remember — something like your own phone number keeps the code memorable without sharing it.
            </p>
          )}
          {effectiveHasBundle && (
            <p className="text-xs text-amber-300">
              We never store your passphrase. If you forget it, we cannot recover or reset your data.
            </p>
          )}
        </header>

        {vaultError && (
          <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {vaultError}
          </p>
        )}

        {effectiveHasBundle && (
          <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-3 text-xs text-neutral-300">
            <p className="font-semibold text-white">Not seeing a passphrase prompt you expect?</p>
            <p className="mt-1 text-neutral-400">
              We default to unlocking to protect existing data. If you have truly never created a passphrase for this account, we will double-check and then let you create one.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleManualOverride}
                disabled={checkingManual}
                className="inline-flex items-center gap-2 rounded-lg bg-neutral-800 px-3 py-2 font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-60"
              >
                {checkingManual ? 'Checking…' : "I haven't created one"}
              </button>
              {manualCreate && (
                <button
                  type="button"
                  onClick={handleReturnToUnlock}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 font-semibold text-white transition hover:border-white/20"
                >
                  Go back to unlock
                </button>
              )}
            </div>
            {manualCheckError && <p className="mt-2 text-rose-300">{manualCheckError}</p>}
          </div>
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

          {!effectiveHasBundle && (
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

          {!effectiveHasBundle && (
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
            Remember passphrase on this device (avoid shared or public computers)
          </label>

          {formError && <p className="text-sm text-rose-400">{formError}</p>}
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          {busy ? 'Working…' : effectiveHasBundle ? 'Unlock vault' : 'Create & continue'}
        </button>
        <p className="text-xs text-neutral-500">
          Tip: Prefer a long passphrase you can remember. Store it in a password manager — if it changes or is lost, the encrypted data stays locked forever.
        </p>
        <p className="text-[11px] text-neutral-500">
          If you save it locally, still back it up elsewhere. Clearing this device will remove the stored passphrase and you’ll need to type it again.
        </p>
      </div>
    </div>
  );
}
