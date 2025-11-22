// src/hooks/useVault.ts
// SECURITY: Shared React hook to manage the in-memory data key. Losing the passphrase or wrapped key makes data unrecoverable.

'use client';

import { useCallback, useEffect, useState } from 'react';
import { decryptText, encryptText, generateDataKey, unwrapDataKey, wrapDataKey, type WrappedBundle } from '@/lib/crypto';
import { idbDel, idbGet, idbSet } from '@/lib/localVault';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

const BUNDLE_KEY_PREFIX = 'oneline.v1.bundle';
const PASSPHRASE_KEY_PREFIX = 'oneline.v1.passphrase';

let sharedKey: CryptoKey | null = null;
let hasStoredBundle = false;
let initialized = false;
let currentUserId: string | null = null;
let cachedBundle: WrappedBundle | null = null;
let lastVaultError: string | null = null;
let cachedPassphrase: string | null = null;
const listeners = new Set<() => void>();
let loadingPromise: Promise<void> | null = null;
let autoUnlockAttemptedFor: string | null = null;

function bundleKeyForUser(userId: string) {
  return `${BUNDLE_KEY_PREFIX}.${userId}`;
}

function passphraseKeyForUser(userId: string) {
  return `${PASSPHRASE_KEY_PREFIX}.${userId}`;
}

function notify() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore listener errors
    }
  });
}

async function persistPassphrase(passphrase: string | null) {
  if (!currentUserId) return;
  const key = passphraseKeyForUser(currentUserId);
  if (passphrase) {
    cachedPassphrase = passphrase;
    await idbSet(key, passphrase).catch(() => {});
  } else {
    cachedPassphrase = null;
    await idbDel(key).catch(() => {});
  }
  notify();
}

async function fetchRemoteBundle(): Promise<WrappedBundle | null> {
  try {
    const res = await fetch('/api/vault', { cache: 'no-store' });
    if (!res.ok) return null;
    const payload = (await res.json()) as { bundle?: WrappedBundle | null };
    return payload?.bundle ?? null;
  } catch {
    return null;
  }
}

async function saveRemoteBundle(bundle: WrappedBundle | null) {
  try {
    await fetch('/api/vault', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ bundle }),
    });
  } catch {
    // best-effort persistence; if offline, the local copy still exists.
  }
}

async function ensureInitialized() {
  if (loadingPromise) {
    await loadingPromise;
    return;
  }

  const supabase = supabaseBrowser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  const needsFreshInit = !initialized || userId !== currentUserId;
  if (!needsFreshInit) return;

  initialized = false;
  notify();

  loadingPromise = (async () => {
    try {
      if (userId !== currentUserId) {
        currentUserId = userId;
        cachedBundle = null;
        hasStoredBundle = false;
        lastVaultError = null;
        sharedKey = null;
        cachedPassphrase = null;
        autoUnlockAttemptedFor = null;
      }

      if (!currentUserId) {
        initialized = true;
        lastVaultError = null;
        return;
      }

      const key = bundleKeyForUser(currentUserId);
      const localBundle = (await idbGet<WrappedBundle>(key)) ?? null;
      if (localBundle) {
        cachedBundle = localBundle;
        hasStoredBundle = true;
        lastVaultError = null;
      }

      const remoteBundle = await fetchRemoteBundle();
      if (remoteBundle) {
        cachedBundle = remoteBundle;
        hasStoredBundle = true;
        await idbSet(key, remoteBundle).catch(() => {});
        lastVaultError = null;
      } else if (!localBundle) {
        cachedBundle = null;
        hasStoredBundle = false;
        lastVaultError = null;
      }

      const storedPassphraseKey = passphraseKeyForUser(currentUserId);
      const savedPassphrase = (await idbGet<string>(storedPassphraseKey).catch(() => null)) ?? null;
      cachedPassphrase = savedPassphrase;

      if (cachedBundle && cachedPassphrase && autoUnlockAttemptedFor !== currentUserId && !sharedKey) {
        autoUnlockAttemptedFor = currentUserId;
        try {
          sharedKey = await unwrapDataKey(cachedBundle, cachedPassphrase);
          lastVaultError = null;
        } catch {
          sharedKey = null;
          cachedPassphrase = null;
          await idbDel(storedPassphraseKey).catch(() => {});
          lastVaultError =
            'Stored passphrase could not decrypt your vault. Re-enter the exact phrase to unlock and optionally save it again.';
        }
      }
    } finally {
      initialized = true;
      notify();
      loadingPromise = null;
    }
  })();

  await loadingPromise;
}

async function persistBundle(bundle: WrappedBundle | null) {
  if (!currentUserId) return;
  const key = bundleKeyForUser(currentUserId);
  if (bundle) {
    cachedBundle = bundle;
    hasStoredBundle = true;
    lastVaultError = null;
    await Promise.all([idbSet(key, bundle).catch(() => {}), saveRemoteBundle(bundle)]);
  } else {
    cachedBundle = null;
    hasStoredBundle = false;
    lastVaultError = null;
    await Promise.all([idbDel(key).catch(() => {}), saveRemoteBundle(null)]);
  }
  notify();
}

export function useVault() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    let active = true;
    ensureInitialized().catch(() => {
      // swallow errors; user can still create a new bundle
    });
    const listener = () => {
      if (active) forceUpdate((v) => v + 1);
    };
    listeners.add(listener);
    return () => {
      active = false;
      listeners.delete(listener);
    };
  }, []);

  const createWithPassphrase = useCallback(async (passphrase: string, rememberDevice: boolean, rememberPassphrase?: boolean) => {
    if (!passphrase) throw new Error('Passphrase required');
    await ensureInitialized();
    if (!currentUserId) throw new Error('Sign in before creating your vault');
    const key = await generateDataKey();
    sharedKey = key;
    lastVaultError = null;
    const bundle = await wrapDataKey(key, passphrase);
    if (rememberDevice) {
      await persistBundle(bundle);
    } else {
      // Keep the remote copy for recovery, but wipe local storage on this device.
      cachedBundle = bundle;
      hasStoredBundle = true;
      lastVaultError = null;
      await saveRemoteBundle(bundle);
      await idbDel(bundleKeyForUser(currentUserId)).catch(() => {});
    }
    if (rememberPassphrase) {
      await persistPassphrase(passphrase);
    } else {
      await persistPassphrase(null);
    }
    notify();
  }, []);

  const unlockWithPassphrase = useCallback(async (passphrase: string, opts?: { rememberPassphrase?: boolean }) => {
    if (!passphrase) throw new Error('Passphrase required');
    await ensureInitialized();
    if (!currentUserId) throw new Error('Sign in before unlocking your vault');
    let bundle = cachedBundle;
    if (!bundle) {
      const key = bundleKeyForUser(currentUserId);
      bundle = (await idbGet<WrappedBundle>(key)) ?? null;
      if (!bundle) {
        bundle = await fetchRemoteBundle();
        if (bundle) {
          await idbSet(key, bundle).catch(() => {});
        }
      }
    }
    if (!bundle) throw new Error('No encrypted vault found. Create one first.');
    try {
      sharedKey = await unwrapDataKey(bundle, passphrase);
      cachedBundle = bundle;
      hasStoredBundle = true;
      lastVaultError = null;
      if (opts?.rememberPassphrase) {
        await persistPassphrase(passphrase);
      } else if (opts?.rememberPassphrase === false) {
        await persistPassphrase(null);
      }
      notify();
    } catch (error) {
      sharedKey = null;
      lastVaultError =
        'Decryption error: the passphrase you entered is different from the one you used when you created your vault. Enter the exact original code to recover access.';
      notify();
      throw new Error(
        'Decryption failed — the passphrase must match the exact code you set when you first encrypted your journal.',
      );
    }
  }, []);

  const lock = useCallback(async (wipeLocal: boolean) => {
    sharedKey = null;
    if (wipeLocal && currentUserId) {
      await idbDel(bundleKeyForUser(currentUserId)).catch(() => {});
      await idbDel(passphraseKeyForUser(currentUserId)).catch(() => {});
      cachedPassphrase = null;
      hasStoredBundle = !!cachedBundle;
    }
    notify();
  }, []);

  return {
    dataKey: sharedKey,
    hasBundle: hasStoredBundle,
    loading: !initialized,
    createWithPassphrase,
    unlockWithPassphrase,
    lock,
    vaultError: lastVaultError,
    hasStoredPassphrase: !!cachedPassphrase,
    encryptText,
    decryptText,
    getCurrentKey: () => sharedKey,
  };
}

// SECURITY NOTE: Vault bundles are synced to the server encrypted with the user's passphrase-derived KEK. Without that phrase,
// the wrapped key remains useless. Losing the passphrase still makes ciphertext unrecoverable.
