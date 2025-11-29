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
let remoteHasVault = false;
let initialized = false;
let currentUserId: string | null = null;
let cachedBundle: WrappedBundle | null = null;
let cachedPassphrase: string | null = null;
let lastVaultError: string | null = null;
const listeners = new Set<() => void>();
let loadingPromise: Promise<void> | null = null;

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

async function fetchRemoteBundle(): Promise<{ bundle: WrappedBundle | null; hasVault: boolean } | null> {
  try {
    const res = await fetch('/api/vault', { cache: 'no-store' });
    if (!res.ok) return null;
    const payload = (await res.json()) as { bundle?: WrappedBundle | null; hasVault?: boolean };
    return { bundle: payload?.bundle ?? null, hasVault: !!payload?.hasVault };
  } catch {
    return null;
  }
}

function readStoredPassphrase(userId: string): string | null {
  try {
    const key = passphraseKeyForUser(userId);
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function persistStoredPassphrase(userId: string, passphrase: string | null) {
  try {
    const key = passphraseKeyForUser(userId);
    if (typeof localStorage === 'undefined') return;
    if (passphrase) {
      localStorage.setItem(key, passphrase);
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // best-effort only
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

async function ensureInitialized(force = false) {
  if (loadingPromise) {
    await loadingPromise;
    return;
  }

  const supabase = supabaseBrowser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? null;
  const userChanged = userId !== currentUserId;

  if (userChanged) {
    currentUserId = userId;
    cachedBundle = null;
    hasStoredBundle = false;
    remoteHasVault = false;
    cachedPassphrase = null;
    lastVaultError = null;
    sharedKey = null;
  }

  const shouldResetLoading = force || !initialized || userChanged;
  if (shouldResetLoading) {
    initialized = false;
    notify();
  }

  loadingPromise = (async () => {
    try {
      if (!currentUserId) {
        cachedPassphrase = null;
        lastVaultError = null;
        return;
      }

      cachedPassphrase = readStoredPassphrase(currentUserId);
      const key = bundleKeyForUser(currentUserId);
      const localBundle = (await idbGet<WrappedBundle>(key)) ?? null;
      if (localBundle) {
        cachedBundle = localBundle;
        hasStoredBundle = true;
        remoteHasVault = true;
        lastVaultError = null;
      } else {
        const remote = await fetchRemoteBundle();
        remoteHasVault = remote?.hasVault ?? false;

        if (remote?.bundle) {
          cachedBundle = remote.bundle;
          hasStoredBundle = true;
          await idbSet(key, remote.bundle).catch(() => {});
          lastVaultError = null;
        } else {
          cachedBundle = null;
          hasStoredBundle = false;
          lastVaultError = null;
        }
      }

      if (cachedBundle && cachedPassphrase && !sharedKey) {
        try {
          sharedKey = await unwrapDataKey(cachedBundle, cachedPassphrase);
          lastVaultError = null;
        } catch {
          sharedKey = null;
          cachedPassphrase = null;
          persistStoredPassphrase(currentUserId, null);
          lastVaultError =
            'The saved passphrase on this device could not unlock the vault. Enter your passphrase again to continue.';
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
    remoteHasVault = true;
    lastVaultError = null;
    await Promise.all([idbSet(key, bundle).catch(() => {}), saveRemoteBundle(bundle)]);
  } else {
    cachedBundle = null;
    hasStoredBundle = false;
    remoteHasVault = false;
    lastVaultError = null;
    await Promise.all([idbDel(key).catch(() => {}), saveRemoteBundle(null)]);
  }
  notify();
}

export function useVault() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    let active = true;
    const supabase = supabaseBrowser();

    ensureInitialized().catch(() => {
      // swallow errors; user can still create a new bundle
    });

    const listener = () => {
      if (active) forceUpdate((v) => v + 1);
    };

    const { data } = supabase.auth.onAuthStateChange(() => {
      ensureInitialized().catch(() => {
        // swallow errors triggered by transient auth states
      });
    });

    listeners.add(listener);

    return () => {
      active = false;
      listeners.delete(listener);
      data.subscription.unsubscribe();
    };
  }, []);

  const createWithPassphrase = useCallback(
    async (passphrase: string, rememberDevice: boolean, rememberPassphrase: boolean) => {
      if (!passphrase) throw new Error('Passphrase required');
      await ensureInitialized();
      if (!currentUserId) throw new Error('Sign in before creating your vault');
      if (hasStoredBundle || remoteHasVault) {
        throw new Error('A vault already exists for this account. Unlock with your existing passphrase.');
      }
      const key = await generateDataKey();
      sharedKey = key;
      lastVaultError = null;
      const bundle = await wrapDataKey(key, passphrase);
      persistStoredPassphrase(currentUserId, rememberPassphrase ? passphrase : null);
      cachedPassphrase = rememberPassphrase ? passphrase : null;
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
      notify();
    },
    [],
  );

  const unlockWithPassphrase = useCallback(async (passphrase: string, rememberPassphrase = false) => {
    if (!passphrase) throw new Error('Passphrase required');
    await ensureInitialized();
    if (!currentUserId) throw new Error('Sign in before unlocking your vault');
    let bundle = cachedBundle;
    if (!bundle) {
      const key = bundleKeyForUser(currentUserId);
      bundle = (await idbGet<WrappedBundle>(key)) ?? null;
      if (!bundle) {
        const remote = await fetchRemoteBundle();
        remoteHasVault = remote?.hasVault ?? remoteHasVault;
        bundle = remote?.bundle ?? null;
        if (bundle) {
          await idbSet(key, bundle).catch(() => {});
        }
      }
    }
    if (!bundle) {
      if (remoteHasVault) {
        throw new Error('Your vault already exists, but the encrypted key could not be loaded. Refresh and try again.');
      }
      throw new Error('No encrypted vault found. Create one first.');
    }
    try {
      sharedKey = await unwrapDataKey(bundle, passphrase);
      cachedBundle = bundle;
      hasStoredBundle = true;
      lastVaultError = null;
      persistStoredPassphrase(currentUserId, rememberPassphrase ? passphrase : null);
      cachedPassphrase = rememberPassphrase ? passphrase : null;
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
      hasStoredBundle = !!cachedBundle;
      persistStoredPassphrase(currentUserId, null);
      cachedPassphrase = null;
    }
    notify();
  }, []);

  return {
    dataKey: sharedKey,
    hasBundle: hasStoredBundle || remoteHasVault,
    loading: !initialized,
    createWithPassphrase,
    unlockWithPassphrase,
    lock,
    passphraseStored: !!cachedPassphrase,
    vaultError: lastVaultError,
    encryptText,
    decryptText,
    getCurrentKey: () => sharedKey,
  };
}

// SECURITY NOTE: Vault bundles are synced to the server encrypted with the user's passphrase-derived KEK. Without that phrase, the wrapped key remains useless. Losing the passphrase still makes ciphertext unrecoverable.
