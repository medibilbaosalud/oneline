// src/hooks/useVault.ts
// SECURITY: Shared React hook to manage the in-memory data key. Losing the passphrase or wrapped key makes data unrecoverable.

'use client';

import { useCallback, useEffect, useState } from 'react';
import { decryptText, encryptText, generateDataKey, unwrapDataKey, wrapDataKey, type WrappedBundle } from '@/lib/crypto';
import { idbDel, idbGet, idbSet } from '@/lib/localVault';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

const BUNDLE_KEY_PREFIX = 'oneline.v1.bundle';

let sharedKey: CryptoKey | null = null;
let hasStoredBundle = false;
let initialized = false;
let currentUserId: string | null = null;
let cachedBundle: WrappedBundle | null = null;
let lastVaultError: string | null = null;
let hasRemoteVaultRecord = false;
let authResolved = false;
const listeners = new Set<() => void>();
let loadingPromise: Promise<void> | null = null;

function bundleKeyForUser(userId: string) {
  return `${BUNDLE_KEY_PREFIX}.${userId}`;
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

async function fetchRemoteBundle(): Promise<{ bundle: WrappedBundle | null; hasVault: boolean }> {
  try {
    const res = await fetch('/api/vault', { cache: 'no-store' });
    if (!res.ok) return { bundle: null, hasVault: false };
    const payload = (await res.json()) as { bundle?: WrappedBundle | null; hasVault?: boolean };
    return { bundle: payload?.bundle ?? null, hasVault: Boolean(payload?.hasVault) };
  } catch {
    return { bundle: null, hasVault: false };
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

  initialized = false;
  authResolved = false;
  notify();

  loadingPromise = (async () => {
    try {
      const supabase = supabaseBrowser();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      authResolved = true;
      const userId = user?.id ?? null;

      if (userId !== currentUserId) {
        currentUserId = userId;
        cachedBundle = null;
        hasStoredBundle = false;
        hasRemoteVaultRecord = false;
        lastVaultError = null;
        sharedKey = null;
      }

      if (!currentUserId) {
        hasRemoteVaultRecord = false;
        lastVaultError = null;
        return;
      }

      const key = bundleKeyForUser(currentUserId);
      const localBundle = (await idbGet<WrappedBundle>(key)) ?? null;
      if (localBundle) {
        cachedBundle = localBundle;
        hasStoredBundle = true;
        hasRemoteVaultRecord = true;
        lastVaultError = null;
        return;
      }

      const remoteBundle = await fetchRemoteBundle();
      hasRemoteVaultRecord = remoteBundle.hasVault;
      if (remoteBundle.bundle) {
        cachedBundle = remoteBundle.bundle;
        hasStoredBundle = true;
        await idbSet(key, remoteBundle.bundle).catch(() => {});
        lastVaultError = null;
      } else {
        cachedBundle = null;
        hasStoredBundle = false;
        lastVaultError = null;
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
    hasRemoteVaultRecord = true;
    lastVaultError = null;
    await Promise.all([idbSet(key, bundle).catch(() => {}), saveRemoteBundle(bundle)]);
  } else {
    cachedBundle = null;
    hasStoredBundle = false;
    hasRemoteVaultRecord = false;
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
    const authListener = supabase.auth.onAuthStateChange(() => {
      ensureInitialized().catch(() => {
        // swallow errors; user can still create a new bundle
      });
    });
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
      authListener?.data.subscription.unsubscribe();
    };
  }, []);

  const createWithPassphrase = useCallback(async (passphrase: string, rememberDevice: boolean) => {
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
      hasRemoteVaultRecord = true;
      lastVaultError = null;
      await saveRemoteBundle(bundle);
      await idbDel(bundleKeyForUser(currentUserId)).catch(() => {});
    }
    notify();
  }, []);

  const unlockWithPassphrase = useCallback(async (passphrase: string) => {
    if (!passphrase) throw new Error('Passphrase required');
    await ensureInitialized();
    if (!currentUserId) throw new Error('Sign in before unlocking your vault');
    let bundle = cachedBundle;
    if (!bundle) {
      const key = bundleKeyForUser(currentUserId);
      bundle = (await idbGet<WrappedBundle>(key)) ?? null;
      if (!bundle) {
        const remote = await fetchRemoteBundle();
        hasRemoteVaultRecord = remote.hasVault;
        bundle = remote.bundle;
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
      notify();
    } catch {
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
      hasStoredBundle = false;
    }
    notify();
  }, []);

  return {
    dataKey: sharedKey,
    hasBundle: hasStoredBundle || hasRemoteVaultRecord,
    loading: !initialized || !authResolved || !currentUserId,
    signedIn: Boolean(currentUserId),
    createWithPassphrase,
    unlockWithPassphrase,
    lock,
    vaultError: lastVaultError,
    encryptText,
    decryptText,
    getCurrentKey: () => sharedKey,
  };
}

// SECURITY NOTE: Vault bundles are synced to the server encrypted with the user's passphrase-derived KEK. Without that phrase,
// the wrapped key remains useless. Losing the passphrase still makes ciphertext unrecoverable.
