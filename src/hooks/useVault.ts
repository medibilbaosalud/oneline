// src/hooks/useVault.ts
// SECURITY: Shared React hook to manage the in-memory data key. Losing the passphrase or wrapped key makes data unrecoverable.

'use client';

import { useCallback, useEffect, useState } from 'react';
import { decryptText, encryptText, generateDataKey, unwrapDataKey, wrapDataKey, type WrappedBundle } from '@/lib/crypto';
import { idbDel, idbGet, idbSet } from '@/lib/localVault';
import { clearStoredPassphrase, getStoredPassphrase, setStoredPassphrase } from '@/lib/passphraseStorage';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

const BUNDLE_KEY_PREFIX = 'oneline.v1.bundle';

let sharedKey: CryptoKey | null = null;
let hasStoredBundle = false;
let expectedRemoteVault = false;
let initialized = false;
let currentUserId: string | null = null;
let cachedBundle: WrappedBundle | null = null;
let lastVaultError: string | null = null;
let cachedPassphrase: string | null = null;
const listeners = new Set<() => void>();
let loadingPromise: Promise<void> | null = null;
let autoUnlockAttemptedFor: string | null = null;

async function resolveUserId(): Promise<string | null> {
  try {
    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) return user.id;

    const sessionResult = await supabase.auth.getSession();
    const sessionUser = sessionResult.data.session?.user;
    if (sessionUser?.id) return sessionUser.id;

    return await fetchServerUserId();
  } catch {
    return null;
  }
}

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

async function persistPassphrase(passphrase: string | null) {
  if (passphrase) {
    cachedPassphrase = passphrase;
    setStoredPassphrase(passphrase);
  } else {
    cachedPassphrase = null;
    clearStoredPassphrase();
  }
  notify();
}

type RemoteVaultPayload = { bundle: WrappedBundle | null; hasVault: boolean; status: 'ok' | 'auth' | 'error' };

async function fetchRemoteBundle(): Promise<RemoteVaultPayload> {
  try {
    const res = await fetch('/api/vault', { cache: 'no-store' });
    if (!res.ok) {
      // If auth is not ready yet, err on the safe side and assume a vault may exist to avoid overwriting it.
      if (res.status === 401 || res.status === 403) {
        return { bundle: null, hasVault: true, status: 'auth' };
      }
      return { bundle: null, hasVault: true, status: 'error' };
    }
    const payload = (await res.json()) as { bundle?: WrappedBundle | null; hasVault?: boolean };
    const bundle = payload?.bundle ?? null;
    return { bundle, hasVault: payload?.hasVault ?? !!bundle, status: 'ok' };
  } catch {
    return { bundle: null, hasVault: true, status: 'error' };
  }
}

async function fetchDirectBundle(userId: string): Promise<WrappedBundle | null> {
  try {
    const supabase = supabaseBrowser();
    const { data } = await supabase
      .from('user_vaults')
      .select('wrapped_b64, iv_b64, salt_b64, version')
      .eq('user_id', userId)
      .maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}

async function hasVaultRecord(userId: string): Promise<boolean> {
  try {
    const supabase = supabaseBrowser();
    const { count } = await supabase
      .from('user_vaults')
      .select('user_id', { count: 'exact', head: true })
      .eq('user_id', userId);

    return (count ?? 0) > 0;
  } catch {
    return false;
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

async function fetchServerUserId(): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/user', { cache: 'no-store' });
    if (!res.ok) return null;
    const payload = (await res.json().catch(() => null)) as { id?: string | null } | null;
    return payload?.id ?? null;
  } catch {
    return null;
  }
}

async function ensureInitialized() {
  if (loadingPromise) {
    await loadingPromise;
    return;
  }

  const userId = await resolveUserId();

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
        expectedRemoteVault = false;
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

      const remote = await fetchRemoteBundle();
      expectedRemoteVault = remote.hasVault || remote.status !== 'ok';
      if (remote.bundle) {
        cachedBundle = remote.bundle;
        hasStoredBundle = true;
        await idbSet(key, remote.bundle).catch(() => {});
        lastVaultError = null;
      } else if (!localBundle && !remote.hasVault) {
        const directBundle = await fetchDirectBundle(currentUserId);
        if (directBundle) {
          cachedBundle = directBundle;
          hasStoredBundle = true;
          expectedRemoteVault = true;
          await idbSet(key, directBundle).catch(() => {});
          lastVaultError = null;
        } else if (await hasVaultRecord(currentUserId)) {
          expectedRemoteVault = true;
          lastVaultError =
            lastVaultError ??
            'A vault already exists for this account, but its encrypted key could not be loaded. Unlock from a trusted device or contact support for help.';
        }
      } else if (!localBundle) {
        cachedBundle = null;
        hasStoredBundle = remote.hasVault;
        lastVaultError = null;
      }

      const savedPassphrase = getStoredPassphrase();
      cachedPassphrase = savedPassphrase;

      if (cachedBundle && cachedPassphrase && autoUnlockAttemptedFor !== currentUserId && !sharedKey) {
        autoUnlockAttemptedFor = currentUserId;
        try {
          sharedKey = await unwrapDataKey(cachedBundle, cachedPassphrase);
          lastVaultError = null;
        } catch {
          sharedKey = null;
          cachedPassphrase = null;
          clearStoredPassphrase();
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
    expectedRemoteVault = true;
    lastVaultError = null;
    await Promise.all([idbSet(key, bundle).catch(() => {}), saveRemoteBundle(bundle)]);
  } else {
    cachedBundle = null;
    hasStoredBundle = false;
    expectedRemoteVault = false;
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
    const supabase = supabaseBrowser();
    const { data } = supabase.auth.onAuthStateChange(() => {
      ensureInitialized().catch(() => {});
    });
    return () => {
      active = false;
      listeners.delete(listener);
      data.subscription?.unsubscribe();
    };
  }, []);

  const createWithPassphrase = useCallback(async (passphrase: string, rememberDevice: boolean, rememberPassphrase?: boolean) => {
    if (!passphrase) throw new Error('Passphrase required');
    await ensureInitialized();
    if (!currentUserId) {
      currentUserId = await resolveUserId();
    }
    if (!currentUserId) throw new Error('Sign in before creating your vault');

    // Safety check: if a vault already exists remotely or locally, do not generate a new key.
    const remote = await fetchRemoteBundle();
    if (remote.status !== 'ok') {
      throw new Error('Unable to confirm your existing vault. Ensure you are signed in and try again.');
    }
    if (remote.bundle || cachedBundle || hasStoredBundle || remote.hasVault || expectedRemoteVault) {
      const existingBundle = remote.bundle ?? cachedBundle;
      if (existingBundle) {
        const key = bundleKeyForUser(currentUserId);
        cachedBundle = existingBundle;
        hasStoredBundle = true;
        expectedRemoteVault = true;
        await idbSet(key, existingBundle).catch(() => {});
        notify();
      } else if (remote.hasVault || expectedRemoteVault) {
        expectedRemoteVault = true;
        notify();
      }

      throw new Error('An encrypted vault already exists for this account. Unlock it with your original passphrase.');
    }

    if (!cachedBundle && !remote.hasVault) {
      const directBundle = await fetchDirectBundle(currentUserId);
      if (directBundle) {
        cachedBundle = directBundle;
        hasStoredBundle = true;
        expectedRemoteVault = true;
        const key = bundleKeyForUser(currentUserId);
        await idbSet(key, directBundle).catch(() => {});
        notify();
        throw new Error('An encrypted vault already exists for this account. Unlock it with your original passphrase.');
      }

      if (await hasVaultRecord(currentUserId)) {
        expectedRemoteVault = true;
        notify();
        throw new Error('An encrypted vault already exists for this account. Unlock it with your original passphrase.');
      }
    }

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
      expectedRemoteVault = true;
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
    if (!currentUserId) {
      currentUserId = await resolveUserId();
    }
    if (!currentUserId) throw new Error('Sign in before unlocking your vault');
    let bundle = cachedBundle;
    if (!bundle) {
      const key = bundleKeyForUser(currentUserId);
      bundle = (await idbGet<WrappedBundle>(key)) ?? null;
      if (!bundle) {
        const remote = await fetchRemoteBundle();
        expectedRemoteVault = remote.hasVault || remote.status !== 'ok';
        bundle = remote.bundle;
        if (bundle) {
          await idbSet(key, bundle).catch(() => {});
        } else if (!remote.hasVault) {
          const directBundle = await fetchDirectBundle(currentUserId);
          if (directBundle) {
            bundle = directBundle;
            cachedBundle = directBundle;
            hasStoredBundle = true;
            expectedRemoteVault = true;
            await idbSet(key, directBundle).catch(() => {});
          }
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
      clearStoredPassphrase();
      cachedPassphrase = null;
      hasStoredBundle = !!cachedBundle;
    }
    notify();
  }, []);

  return {
    dataKey: sharedKey,
    hasBundle: hasStoredBundle || expectedRemoteVault,
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
