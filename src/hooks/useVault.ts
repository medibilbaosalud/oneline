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

export type VaultStatus = 'loading' | 'absent' | 'present' | 'error';

let sharedKey: CryptoKey | null = null;
let vaultStatus: VaultStatus = 'loading';
let initialized = false;
let currentUserId: string | null = null;
let cachedBundle: WrappedBundle | null = null;
let cachedPassphrase: string | null = null;
let lastVaultError: string | null = null;
const listeners = new Set<() => void>();
let loadingPromise: Promise<void> | null = null;
let pendingAuthRetry: NodeJS.Timeout | null = null;

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

async function fetchVaultStatus(userId: string): Promise<'unknown' | 'absent' | 'present'> {
  try {
    const supabase = supabaseBrowser();
    const { data, error } = await supabase
      .from('user_vault_status')
      .select('has_passphrase')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) return 'unknown';
    if (!data) return 'absent';
    const row = data as { has_passphrase: boolean };
    return row.has_passphrase ? 'present' : 'absent';
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
    const res = await fetch('/api/vault', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ bundle }),
    });
    if (res.status === 409) {
      throw new Error('Vault already exists');
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Vault already exists') {
      throw err;
    }
    // best-effort persistence; if offline, the local copy still exists.
  }
}

async function resolveUserWithRetry(): Promise<{ userId: string | null; sessionResolved: boolean }> {
  const supabase = supabaseBrowser();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const [{ data: sessionData }, { data: userData }] = await Promise.all([
      supabase.auth.getSession(),
      supabase.auth.getUser(),
    ]);

    const session = sessionData.session;
    const user = userData.user;
    const userId = (user ?? session?.user)?.id ?? null;

    if (userId) {
      return { userId, sessionResolved: true };
    }

    // If Supabase reports no session at all, stop retrying and treat it as resolved.
    if (!session) {
      return { userId: null, sessionResolved: true };
    }

    // Otherwise, give the client a moment to finish hydrating the session before re-checking.
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return { userId: null, sessionResolved: true };
}

async function ensureInitialized(force = false) {
  if (loadingPromise) {
    await loadingPromise;
    return;
  }

  const { userId, sessionResolved } = await resolveUserWithRetry();
  const userChanged = userId !== currentUserId;

  if (userChanged) {
    if (pendingAuthRetry) {
      clearTimeout(pendingAuthRetry);
      pendingAuthRetry = null;
    }
    currentUserId = userId;
    cachedBundle = null;
    vaultStatus = 'loading';
    cachedPassphrase = null;
    lastVaultError = null;
    sharedKey = null;
  }

  const shouldResetLoading = force || !initialized || userChanged;
  if (shouldResetLoading) {
    initialized = false;
    vaultStatus = 'loading';
    notify();
  }

  if (!currentUserId) {
    // Without a confirmed user, defer vault decisions to avoid showing the creation flow incorrectly.
    if (pendingAuthRetry) {
      clearTimeout(pendingAuthRetry);
      pendingAuthRetry = null;
    }

    if (!force && sessionResolved) {
      lastVaultError =
        lastVaultError ?? 'Preparing your session. If this persists, refresh and try again before creating a passphrase.';
      loadingPromise = null;
      pendingAuthRetry = setTimeout(() => {
        ensureInitialized(true).catch(() => {
          // swallow retry errors
        });
      }, 250);
      return;
    }

    loadingPromise = (async () => {
      try {
        // Safety Timeout: If initialization takes > 10s, fail to error state.
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Vault initialization timed out')), 10000),
        );

        const initLogic = async () => {
          cachedPassphrase = null;
          vaultStatus = 'loading'; // Keep loading until we have a user or confirm no user
          lastVaultError = sessionResolved
            ? 'Sign in to continue before creating or unlocking your vault.'
            : 'Preparing your session. Refresh and try again before creating a passphrase.';
        };

        await Promise.race([initLogic(), timeoutPromise]);
      } finally {
        initialized = true;
        notify();
        loadingPromise = null;
      }
    })();

    await loadingPromise;
    return;
  }

  loadingPromise = (async () => {
    try {
      // Safety Timeout: If initialization takes > 10s, fail to error state.
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Vault initialization timed out')), 10000),
      );

      const initLogic = async () => {
        if (!currentUserId) {
          cachedPassphrase = null;
          vaultStatus = 'loading';
          lastVaultError = null;
          return;
        }

        cachedPassphrase = readStoredPassphrase(currentUserId);
        const key = bundleKeyForUser(currentUserId);
        const localBundle = (await idbGet<WrappedBundle>(key)) ?? null;

        // Always check remote to ensure we respect the server's truth (e.g. if user wiped vault in DB)
        const remote = await fetchRemoteBundle();
        let remoteStatus: 'present' | 'absent' | 'unknown' = 'unknown';

        if (remote) {
          if (remote.bundle) {
            remoteStatus = 'present';
          } else if (remote.hasVault) {
            remoteStatus = 'present';
          } else {
            remoteStatus = 'absent';
          }
        } else {
          // If fetchRemoteBundle failed (e.g. 404 or network), try specific status check
          remoteStatus = await fetchVaultStatus(currentUserId);
        }

        // Reconciliation Logic
        if (remoteStatus === 'absent') {
          // Server says NO vault.
          // We treat status as absent to allow creation, but we do NOT delete local data automatically
          // per user request (safety measure).
          cachedBundle = null;
          vaultStatus = 'absent';
          lastVaultError = null;
        } else if (remoteStatus === 'present') {
          // Server says YES vault.
          if (remote?.bundle) {
            // We got a fresh bundle from server
            cachedBundle = remote.bundle;
            vaultStatus = 'present';
            await idbSet(key, remote.bundle).catch(() => { });
            lastVaultError = null;
          } else if (localBundle) {
            // We have local bundle, and server confirms vault exists. Use local.
            cachedBundle = localBundle;
            vaultStatus = 'present';
            lastVaultError = null;
          } else {
            // Server says present, but we have no bundle (neither local nor remote payload).
            cachedBundle = null;
            vaultStatus = 'present'; // Will show Unlock, but unlock will fail/refetch if no bundle.
            lastVaultError = 'Your vault exists but the encrypted key could not be loaded. Refresh or try again.';
          }
        } else {
          // Remote status is UNKNOWN (offline/error).
          // Fallback to local if available.
          if (localBundle) {
            cachedBundle = localBundle;
            vaultStatus = 'present';
            lastVaultError = null;
          } else {
            // No local, no remote info.
            vaultStatus = 'error';
            lastVaultError = 'Unable to verify your vault status. Please check your connection and try again.';
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
      };

      await Promise.race([initLogic(), timeoutPromise]);
    } catch (err) {
      console.error('Vault initialization error:', err);
      vaultStatus = 'error';
      lastVaultError = 'An unexpected error occurred while loading your vault.';
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
    // SECURITY: Try to save to remote first to ensure we don't overwrite an existing vault.
    await saveRemoteBundle(bundle);

    cachedBundle = bundle;
    vaultStatus = 'present';
    lastVaultError = null;
    await idbSet(key, bundle).catch(() => { });
  } else {
    cachedBundle = null;
    vaultStatus = 'absent';
    lastVaultError = null;
    await Promise.all([idbDel(key).catch(() => { }), saveRemoteBundle(null)]);
  }
  notify();
}

export function useVault() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    let active = true;
    const supabase = supabaseBrowser();

    ensureInitialized().catch(() => {
      // swallow errors
    });

    const listener = () => {
      if (active) forceUpdate((v) => v + 1);
    };

    const { data } = supabase.auth.onAuthStateChange(() => {
      ensureInitialized().catch(() => {
        // swallow errors
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

      if (vaultStatus === 'loading' || vaultStatus === 'error') {
        throw new Error('Unable to verify vault status. Please try again.');
      }

      if (vaultStatus === 'present') {
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
        // Check remote first
        await saveRemoteBundle(bundle);

        cachedBundle = bundle;
        vaultStatus = 'present';
        lastVaultError = null;
        await idbDel(bundleKeyForUser(currentUserId)).catch(() => { });
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
          if (remote.bundle) {
            bundle = remote.bundle;
            vaultStatus = 'present';
          } else if (remote.hasVault) {
            vaultStatus = 'present';
          } else {
            vaultStatus = 'absent';
          }
        }

        if (bundle) {
          await idbSet(key, bundle).catch(() => { });
        }
      }
    }

    if (!bundle) {
      if (vaultStatus === 'absent') {
        throw new Error('No encrypted vault found. Please create a new passphrase.');
      }
      if (vaultStatus === 'error') {
        throw new Error('Unable to load vault. Please check your connection.');
      }
      // If status is present but no bundle, we have a problem (data loss or fetch error)
      throw new Error(
        lastVaultError ?? 'Your vault exists but the data could not be loaded. Please try again.',
      );
    }

    try {
      sharedKey = await unwrapDataKey(bundle, passphrase);
      cachedBundle = bundle;
      vaultStatus = 'present';
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
      await idbDel(bundleKeyForUser(currentUserId)).catch(() => { });
      // If we wipe local, we still technically have a vault on the server, so status is still present
      // unless we explicitly deleted it (which this function doesn't do, it just locks).
      // If the intention of 'wipeLocal' is to reset everything, we might need to check.
      // But usually 'lock' just clears the key from memory.
      // If wipeLocal is true, it means "Forget this device".
      persistStoredPassphrase(currentUserId, null);
      cachedPassphrase = null;
      cachedBundle = null; // Clear cached bundle so we fetch again next time
      // Status remains 'present' because the account still has a vault.
    }
    notify();
  }, []);

  return {
    dataKey: sharedKey,
    status: vaultStatus,
    loading: vaultStatus === 'loading',
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
