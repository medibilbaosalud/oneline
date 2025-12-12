// src/components/VaultGate.tsx
// SECURITY: Presents UI to unlock the client-side vault. Passphrases never leave the browser; losing them means permanent data loss.

'use client';

import { useEffect, useState } from 'react';
import { useVault } from '@/hooks/useVault';
import { useVisitor } from '@/components/VisitorMode';

import { motion, AnimatePresence } from 'framer-motion';

type VaultGateProps = {
  children: React.ReactNode;
  demoContent?: React.ReactNode; // Optional demo content for visitor mode
};

export default function VaultGate({ children, demoContent }: VaultGateProps) {
  const { dataKey, status, loading, createWithPassphrase, unlockWithPassphrase, vaultError, passphraseStored } = useVault();
  const { isVisitor, showSignupPrompt } = useVisitor();
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [remember, setRemember] = useState(true);
  const [rememberPassphrase, setRememberPassphrase] = useState(true);
  useEffect(() => {
    setRememberPassphrase(passphraseStored);
  }, [passphraseStored]);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // In visitor mode, show demo content or default demo UI
  if (isVisitor) {
    if (demoContent) {
      return <>{demoContent}</>;
    }
    // Show children but with save disabled (handled by parent)
    return <>{children}</>;
  }

  if (loading || status === 'loading') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex h-64 items-center justify-center rounded-2xl border border-white/10 bg-neutral-950/60 text-neutral-400"
      >
        Preparing secure vault…
      </motion.div>
    );
  }

  if (dataKey) {
    return <>{children}</>;
  }

  // If we have an error determining status (e.g. network fail), show it.
  if (status === 'error') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-3xl border border-rose-500/20 bg-neutral-950/70 p-6 shadow-xl backdrop-blur"
      >
        <h2 className="text-xl font-semibold text-rose-400">Connection Error</h2>
        <p className="mt-2 text-sm text-neutral-400">
          {vaultError ?? 'Unable to verify your vault status. Please check your connection and try again.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-xl bg-neutral-800 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Retry
        </button>
      </motion.div>
    );
  }

  const isUnlockMode = status === 'present';

  async function handleSubmit() {
    const trimmed = passphrase.trim();
    if (!trimmed) {
      setFormError('Enter a passphrase.');
      return;
    }
    if (!isUnlockMode) {
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
      if (isUnlockMode) {
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
      setFormError(isUnlockMode ? fallback : message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-3xl border border-white/10 bg-neutral-950/70 p-6 shadow-xl backdrop-blur"
    >
      <div className="space-y-4 text-sm text-neutral-300">
        <header className="space-y-1">
          <h2 className="text-xl font-semibold text-white">
            {isUnlockMode ? 'Unlock your encrypted journal' : 'Create your encrypted vault'}
          </h2>
          <p className="text-neutral-400">
            {isUnlockMode
              ? 'Enter the exact passphrase you created before. A different phrase will fail and your encrypted entries will remain unreadable.'
              : 'Choose a strong passphrase and type it twice to confirm. You must reuse this exact code every time you unlock OneLine.'}
          </p>
          {!isUnlockMode && (
            <p className="text-xs text-amber-300">
              Set it once and never change it — losing or altering this passphrase permanently locks all existing entries.
            </p>
          )}
          {!isUnlockMode && (
            <p className="text-xs text-neutral-400">
              Choose numbers that are easy to remember — something like your own phone number keeps the code memorable without sharing it.
            </p>
          )}
          {isUnlockMode && (
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
                if (formError) setFormError(null);
              }}
              className={`rounded-xl border ${formError ? 'border-rose-500/50 focus:border-rose-500' : 'border-white/10 focus:border-indigo-500'} bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500/30 transition-colors`}
              placeholder="Enter a strong passphrase"
              autoComplete="current-password"
            />
          </label>

          {!isUnlockMode && (
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

          {!isUnlockMode && (
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

          <AnimatePresence>
            {formError && (
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: [0, -5, 5, -5, 5, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="text-sm text-rose-400"
              >
                {formError}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          type="button"
          onClick={handleSubmit}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          {busy ? 'Working…' : isUnlockMode ? 'Unlock vault' : 'Create & continue'}
        </motion.button>
        <p className="text-xs text-neutral-500">
          Tip: Prefer a long passphrase you can remember. Store it in a password manager — if it changes or is lost, the encrypted data stays locked forever.
        </p>
      </div>
    </motion.div>
  );
}
