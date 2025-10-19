// src/components/VaultGate.tsx
// SECURITY: Presents UI to unlock the client-side vault. Passphrases never leave the browser; losing them means permanent data loss.

'use client';

import { useState } from 'react';
import { useVault } from '@/hooks/useVault';

export default function VaultGate({ children }: { children: React.ReactNode }) {
  const { dataKey, hasBundle, loading, createWithPassphrase, unlockWithPassphrase } = useVault();
  const [passphrase, setPassphrase] = useState('');
  const [remember, setRemember] = useState(true);
  const [mode, setMode] = useState<'unlock' | 'create'>(hasBundle ? 'unlock' : 'create');
  const [error, setError] = useState<string | null>(null);
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
    if (!passphrase.trim()) {
      setError('Enter a passphrase.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === 'unlock' && hasBundle) {
        await unlockWithPassphrase(passphrase.trim());
      } else {
        await createWithPassphrase(passphrase.trim(), remember);
      }
      setPassphrase('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to unlock';
      setError(message);
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
            Only this passphrase can decrypt your entries. We cannot recover it if it is lost.
          </p>
        </header>

        <div className="space-y-3">
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wider text-neutral-500">Passphrase</span>
            <input
              type="password"
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
              className="rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Enter a strong passphrase"
              autoComplete="current-password"
            />
          </label>

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

          {hasBundle && (
            <button
              type="button"
              onClick={() => {
                setMode((prev) => (prev === 'unlock' ? 'create' : 'unlock'));
                setError(null);
              }}
              className="text-xs font-medium text-indigo-300 hover:text-indigo-200"
            >
              {mode === 'unlock' ? 'Use a new passphrase on this device' : 'Unlock with existing passphrase'}
            </button>
          )}

          {error && <p className="text-sm text-rose-400">{error}</p>}
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          {busy ? 'Working…' : hasBundle && mode === 'unlock' ? 'Unlock vault' : 'Create & continue'}
        </button>
        <p className="text-xs text-neutral-500">
          Tip: Prefer a long passphrase you can remember. For hardware-backed protection consider a password manager or FIDO key.
        </p>
      </div>
    </div>
  );
}
