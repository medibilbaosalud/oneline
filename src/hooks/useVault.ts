// src/hooks/useVault.ts
// SECURITY: Shared React hook to manage the in-memory data key. Losing the passphrase or wrapped key makes data unrecoverable.

'use client';

import { useCallback, useEffect, useState } from 'react';
import { decryptText, encryptText, generateDataKey, unwrapDataKey, wrapDataKey, type WrappedBundle } from '@/lib/crypto';
import { idbDel, idbGet, idbSet } from '@/lib/localVault';
import { clearStoredPassphrase, getStoredPassphrase, setStoredPassphrase } from '@/lib/passphraseStorage';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

const BUNDLE_KEY_PREFIX = 'oneline.v1.bundle';
const VAULT_SEEN_PREFIX = 'oneline.v1.vault-seen';

let sharedKey: CryptoKey | null = null;
let hasStoredBundle = false;
let hasExistingVault = false;
let journalPresence = false;
let journalPresenceCertain = false;
let journalAbsenceConfirmed = false;
let initialized = false;
let currentUserId: string | null = null;
let cachedBundle: WrappedBundle | null = null;
let lastVaultError: string | null = null;
let cachedPassphrase: string | null = null;
let userConfirmedNoVault: string | null = null;
let confirmedAbsence = false;
const listeners = new Set<() => void>();
let loadingPromise: Promise<void> | null = null;
let autoUnlockAttemptedFor: string | null = null;

function vaultSeenKey(userId: string) {
  return `${VAULT_SEEN_PREFIX}.${userId}`;
}

function markVaultSeen(userId: string) {
  try {
    localStorage.setItem(vaultSeenKey(userId), '1');
  } catch {
    // Non-blocking cache to reinforce duplicate-creation protection.
  }
}

function hasLocalVaultMarker(userId: string) {
  try {
    return localStorage.getItem(vaultSeenKey(userId)) === '1';
  } catch {
    return false;
  }
}

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

type DirectBundleResult = { bundle: WrappedBundle | null; certainty: boolean };

async function fetchRemoteBundle(): Promise<RemoteVaultPayload> {
  try {
    const res = await fetch('/api/vault', { cache: 'no-store' });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return { bundle: null, hasVault: false, status: 'auth' };
      }
      return { bundle: null, hasVault: false, status: 'error' };
    }
    const payload = (await res.json()) as { bundle?: WrappedBundle | null; hasVault?: boolean };
    const bundle = payload?.bundle ?? null;
    return { bundle, hasVault: payload?.hasVault ?? !!bundle, status: 'ok' };
  } catch {
    return { bundle: null, hasVault: false, status: 'error' };
  }
}

async function saveRemoteBundle(bundle: WrappedBundle | null) {
  try {
    await fetch('/api/vault', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bundle }),
    });
  } catch {
    // Ignore remote persistence errors; local state will continue to reflect the latest bundle.
  }
}

async function fetchDirectBundle(userId: string): Promise<DirectBundleResult> {
  try {
    const supabase = supabaseBrowser();
    const { data, error } = await supabase
      .from('user_vaults')
      .select('wrapped_b64, iv_b64, salt_b64, version')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return { bundle: null, certainty: false };
    }

    if (!data) {
      return { bundle: null, certainty: true };
    }

    return { bundle: data, certainty: true };
  } catch {
    return { bundle: null, certainty: false };
  }
}

type VaultPresence = { present: boolean; certain: boolean };

async function detectVaultRecordPresence(userId: string): Promise<VaultPresence> {
  try {
    const supabase = supabaseBrowser();
    const { count, error } = await supabase
      .from('user_vaults')
      .select('user_id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error || count === null) {
      return { present: false, certain: false };
    }

    return { present: (count ?? 0) > 0, certain: true };
  } catch {
    return { present: false, certain: false };
  }
}

type JournalPresence = { present: boolean; certain: boolean };

async function queryJournalPresence(userId: string): Promise<JournalPresence> {
  try {
    const supabase = supabaseBrowser();
    const { count, error } = await supabase
      .from('journal')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) return { present: false, certain: false };
    if (count === null) return { present: false, certain: false };

    return { present: (count ?? 0) > 0, certain: true };
  } catch {
    return { present: false, certain: false };
  }
}

async function fetchServerJournalPresence(): Promise<JournalPresence> {
  try {
    const res = await fetch('/api/journal/presence', { cache: 'no-store' });
    if (!res.ok) {
      return { present: false, certain: false };
    }
    const payload = (await res.json().catch(() => null)) as { present?: boolean } | null;
    return { present: !!payload?.present, certain: true };
  } catch {
    return { present: false, certain: false };
  }
}

async function detectJournalPresence(userId: string): Promise<JournalPresence> {
  const clientPresence = await queryJournalPresence(userId);
  if (clientPresence.present) return clientPresence;

  const serverPresence = await fetchServerJournalPresence();
  if (serverPresence.present) return serverPresence;

  return { present: false, certain: clientPresence.certain && serverPresence.certain };
}

function clearManualNoVaultFlagIfDifferent(userId: string | null) {
  if (userConfirmedNoVault && userConfirmedNoVault !== userId) {
    userConfirmedNoVault = null;
  }
}

type VaultSignals = {
  localBundle: WrappedBundle | null;
  remote: RemoteVaultPayload;
  direct: DirectBundleResult;
  presence: VaultPresence;
  journal: JournalPresence;
  localMarker: boolean;
  resolvedBundle: WrappedBundle | null;
  existingVault: boolean;
  absenceConfirmed: boolean;
};

async function evaluateVaultState(userId: string, applyState = true): Promise<VaultSignals> {
  const key = bundleKeyForUser(userId);
  const [localBundleResult, remote, direct, presence, journal] = await Promise.all([
    idbGet<WrappedBundle>(key).catch(() => null),
    fetchRemoteBundle(),
    fetchDirectBundle(userId),
    detectVaultRecordPresence(userId),
    detectJournalPresence(userId),
  ]);

  const localBundle = localBundleResult ?? null;

  const localMarker = hasLocalVaultMarker(userId);
  const resolvedBundle = remote.bundle ?? localBundle ?? (direct.certainty ? direct.bundle : null);

  const existingVault = Boolean(
    resolvedBundle ||
      (remote.status === 'ok' && remote.hasVault) ||
      (direct.certainty && !!direct.bundle) ||
      (presence.present && presence.certain) ||
      (journal.present && journal.certain) ||
      localMarker,
  );

  const absenceConfirmed =
    !existingVault &&
    remote.status === 'ok' &&
    !remote.hasVault &&
    !remote.bundle &&
    direct.certainty &&
    !direct.bundle &&
    presence.certain &&
    !presence.present &&
    journal.certain &&
    !journal.present &&
    !localMarker;

  if (applyState) {
    journalPresence = journal.present;
    journalPresenceCertain = journal.certain;
    journalAbsenceConfirmed = journal.certain && !journal.present;
    hasStoredBundle = !!resolvedBundle;
    hasExistingVault = existingVault;
    confirmedAbsence = absenceConfirmed;

    if (resolvedBundle) {
      cachedBundle = resolvedBundle;
      lastVaultError = null;
      markVaultSeen(userId);
      await idbSet(key, resolvedBundle).catch(() => {});
      userConfirmedNoVault = null;
    } else {
      cachedBundle = null;
      if (existingVault) {
        lastVaultError =
          lastVaultError ?? 'We detected an existing vault for this account. Unlock it with your original passphrase.';
        markVaultSeen(userId);
        userConfirmedNoVault = null;
      } else if (!absenceConfirmed && remote.status !== 'ok') {
        lastVaultError = lastVaultError ?? 'Unable to confirm your vault status right now. Try again in a moment.';
      } else {
        lastVaultError = null;
      }
    }
  }

  return { localBundle, remote, direct, presence, journal, localMarker, resolvedBundle, existingVault, absenceConfirmed };
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
  clearManualNoVaultFlagIfDifferent(userId);
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
        hasExistingVault = false;
        journalPresence = false;
        journalPresenceCertain = false;
        journalAbsenceConfirmed = false;
        lastVaultError = null;
        sharedKey = null;
        cachedPassphrase = null;
        confirmedAbsence = false;
        autoUnlockAttemptedFor = null;
      }

      if (!currentUserId) {
        initialized = true;
        lastVaultError = null;
        return;
      }

      const signals = await evaluateVaultState(currentUserId);
      const savedPassphrase = getStoredPassphrase();
      cachedPassphrase = savedPassphrase;

      if (signals.resolvedBundle && cachedPassphrase && autoUnlockAttemptedFor !== currentUserId && !sharedKey) {
        autoUnlockAttemptedFor = currentUserId;
        try {
          sharedKey = await unwrapDataKey(signals.resolvedBundle, cachedPassphrase);
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
    hasExistingVault = true;
    confirmedAbsence = false;
    lastVaultError = null;
    markVaultSeen(currentUserId);
    await Promise.all([idbSet(key, bundle).catch(() => {}), saveRemoteBundle(bundle)]);
  } else {
    cachedBundle = null;
    hasStoredBundle = false;
    hasExistingVault = false;
    confirmedAbsence = false;
    lastVaultError = null;
    await Promise.all([idbDel(key).catch(() => {}), saveRemoteBundle(null)]);
  }
  notify();
}

export function useVault() {
  const [, forceUpdate] = useState(0);
  const manualOverrideActive = currentUserId ? userConfirmedNoVault === currentUserId : false;

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

    const signals = await evaluateVaultState(currentUserId);
    if (signals.existingVault && userConfirmedNoVault !== currentUserId) {
      throw new Error('An encrypted vault already exists for this account. Unlock it with your original passphrase.');
    }

    const key = await generateDataKey();
    sharedKey = key;
    lastVaultError = null;
    const bundle = await wrapDataKey(key, passphrase);
    if (rememberDevice) {
      await persistBundle(bundle);
    } else {
      cachedBundle = bundle;
      hasStoredBundle = true;
      hasExistingVault = true;
      confirmedAbsence = false;
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

    const signals = await evaluateVaultState(currentUserId);
    let bundle = cachedBundle ?? signals.resolvedBundle;
    if (!bundle && signals.remote.status === 'ok' && signals.remote.hasVault) {
      const refreshed = await fetchRemoteBundle();
      bundle = refreshed.bundle ?? null;
      if (bundle) {
        await idbSet(bundleKeyForUser(currentUserId), bundle).catch(() => {});
        cachedBundle = bundle;
        hasStoredBundle = true;
        hasExistingVault = true;
        confirmedAbsence = false;
        lastVaultError = null;
      }
    }

    if (!bundle) {
      if (signals.existingVault || hasExistingVault) {
        lastVaultError =
          lastVaultError ??
          'We found evidence of an existing vault for this account. Unlock it with your original passphrase from a trusted device.';
        notify();
        throw new Error('Encrypted vault expected. Unlock it with your original passphrase.');
      }

      throw new Error('No encrypted vault found. Create one first.');
    }
    try {
      sharedKey = await unwrapDataKey(bundle, passphrase);
      cachedBundle = bundle;
      hasStoredBundle = true;
      hasExistingVault = true;
      confirmedAbsence = false;
      markVaultSeen(currentUserId);
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
      throw new Error('Decryption failed — the passphrase must match the exact code you set when you first encrypted your journal.');
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

  const requestNoVaultOverride = useCallback(async () => {
    await ensureInitialized();
    if (!currentUserId) {
      currentUserId = await resolveUserId();
    }
    if (!currentUserId) throw new Error('Sign in before continuing.');

    const signals = await evaluateVaultState(currentUserId);
    if (signals.existingVault) {
      lastVaultError = 'We detected previous activity for this account. Unlock with your existing passphrase instead of creating a new one.';
      notify();
      return false;
    }

    userConfirmedNoVault = currentUserId;
    confirmedAbsence = confirmedAbsence || signals.absenceConfirmed;
    lastVaultError = null;
    notify();
    return true;
  }, []);

  const clearNoVaultOverride = useCallback(() => {
    userConfirmedNoVault = null;
    notify();
  }, []);

  return {
    dataKey: sharedKey,
    loading: !initialized,
    createWithPassphrase,
    unlockWithPassphrase,
    lock,
    vaultError: lastVaultError,
    hasStoredPassphrase: !!cachedPassphrase,
    requestNoVaultOverride,
    clearNoVaultOverride,
    manualCreationOverride: manualOverrideActive,
    encryptText,
    decryptText,
    getCurrentKey: () => sharedKey,
    hasBundle: !manualOverrideActive && hasExistingVault,
    confirmedNoVault: confirmedAbsence,
  };
}

// SECURITY NOTE: Vault bundles are synced to the server encrypted with the user's passphrase-derived KEK. Without that phrase,
// the wrapped key remains useless. Losing the passphrase still makes ciphertext unrecoverable.
