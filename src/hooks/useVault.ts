// src/hooks/useVault.ts
// SECURITY: Shared React hook to manage the in-memory data key. Losing the passphrase or wrapped key makes data unrecoverable.

'use client';

import { useCallback, useEffect, useState } from 'react';
import { decryptText, encryptText, generateDataKey, unwrapDataKey, wrapDataKey, type WrappedBundle } from '@/lib/crypto';
import { idbDel, idbGet, idbSet } from '@/lib/localVault';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

const BUNDLE_KEY_PREFIX = 'oneline.v1.bundle';
const PASSPHRASE_KEY_PREFIX = 'oneline.v1.passphrase';

type RemoteStatus = 'unknown' | 'absent' | 'present';

let sharedKey: CryptoKey | null = null;
let hasStoredBundle = false;
let remoteVaultStatus: RemoteStatus = 'unknown';
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

async function fetchVaultStatus(userId: string): Promise<RemoteStatus> {
  try {
    const supabase = supabaseBrowser();
    const { data, error } = await supabase
      .from('user_vault_status')
      .select('has_passphrase')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) return 'unknown';
    if (!data) return 'absent';
    return data.has_passphrase ? 'present' : 'absent';
  } catch {
    return 'unknown';
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
    remoteVaultStatus = 'unknown';
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
        remoteVaultStatus = 'unknown';
        lastVaultError = null;
        return;
      }

      cachedPassphrase = readStoredPassphrase(currentUserId);
      const key = bundleKeyForUser(currentUserId);
      const localBundle = (await idbGet<WrappedBundle>(key)) ?? null;
      if (localBundle) {
        cachedBundle = localBundle;
        hasStoredBundle = true;
        remoteVaultStatus = 'present';
        lastVaultError = null;
      } else {
        const remote = await fetchRemoteBundle();
        if (remote) {
          remoteVaultStatus = remote.hasVault ? 'present' : 'absent';
        }

        if (!remote) {
          const statusFallback = await fetchVaultStatus(currentUserId);
          if (statusFallback !== 'unknown') {
            remoteVaultStatus = statusFallback;
          } else {
            lastVaultError =
              lastVaultError ??
              'Unable to verify your vault status right now. Please try again to continue unlocking your journal.';
          }
        }

        if (remote?.bundle) {
          cachedBundle = remote.bundle;
          hasStoredBundle = true;
          await idbSet(key, remote.bundle).catch(() => {});
          lastVaultError = null;
        } else {
          cachedBundle = null;
          hasStoredBundle = false;
          if (remoteVaultStatus === 'present') {
            lastVaultError =
              lastVaultError ??
              'Your vault exists but the encrypted key could not be loaded. Refresh or try again before creating a new passphrase.';
          }
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
    remoteVaultStatus = 'present';
    lastVaultError = null;
    await Promise.all([idbSet(key, bundle).catch(() => {}), saveRemoteBundle(bundle)]);
  } else {
    cachedBundle = null;
    hasStoredBundle = false;
    remoteVaultStatus = 'absent';
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
      if (remoteVaultStatus === 'unknown') {
        throw new Error('Unable to verify your vault status. Please refresh and try again.');
      }
      if (hasStoredBundle || remoteVaultStatus === 'present') {
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
        remoteVaultStatus = 'present';
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
        if (remote) {
          remoteVaultStatus = remote.hasVault ? 'present' : 'absent';
        }
        bundle = remote?.bundle ?? null;
        if (bundle) {
          await idbSet(key, bundle).catch(() => {});
        }
      }
    }
    if (!bundle) {
      if (remoteVaultStatus === 'unknown') {
        const statusFallback = await fetchVaultStatus(currentUserId);
        if (statusFallback !== 'unknown') {
          remoteVaultStatus = statusFallback;
        }
      }

      if (remoteVaultStatus !== 'absent') {
        throw new Error(
          lastVaultError ??
            'Your vault already exists, but the encrypted key could not be loaded. Refresh and try again or retry unlocking.',
        );
      }

      throw new Error(
        lastVaultError ?? 'No encrypted vault found. Please try again or create a new passphrase after status is confirmed.',
      );
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

  const fallbackUnlock = remoteVaultStatus === 'unknown' && !!lastVaultError;

  return {
    dataKey: sharedKey,
    hasBundle: hasStoredBundle || remoteVaultStatus === 'present' || fallbackUnlock,
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
