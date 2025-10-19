// src/hooks/useVault.ts
// SECURITY: Shared React hook to manage the in-memory data key. Losing the passphrase or wrapped key makes data unrecoverable.

'use client';

import { useCallback, useEffect, useState } from 'react';
import { decryptText, encryptText, generateDataKey, unwrapDataKey, wrapDataKey, type WrappedBundle } from '@/lib/crypto';
import { idbDel, idbGet, idbSet } from '@/lib/localVault';

const BUNDLE_KEY = 'oneline.v1.bundle';

let sharedKey: CryptoKey | null = null;
let hasStoredBundle = false;
let initialized = false;
const listeners = new Set<() => void>();
let initPromise: Promise<void> | null = null;

function notify() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore listener errors
    }
  });
}

async function ensureInitialized() {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const bundle = await idbGet<WrappedBundle>(BUNDLE_KEY);
        hasStoredBundle = !!bundle;
      } finally {
        initialized = true;
        notify();
      }
    })();
  }
  await initPromise;
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

  const createWithPassphrase = useCallback(async (passphrase: string, rememberDevice: boolean) => {
    if (!passphrase) throw new Error('Passphrase required');
    const key = await generateDataKey();
    sharedKey = key;
    if (rememberDevice) {
      const bundle = await wrapDataKey(key, passphrase);
      await idbSet(BUNDLE_KEY, bundle);
      hasStoredBundle = true;
    } else {
      await idbDel(BUNDLE_KEY).catch(() => {});
      hasStoredBundle = false;
    }
    notify();
  }, []);

  const unlockWithPassphrase = useCallback(async (passphrase: string) => {
    if (!passphrase) throw new Error('Passphrase required');
    const bundle = await idbGet<WrappedBundle>(BUNDLE_KEY);
    if (!bundle) throw new Error('No saved key on this device');
    sharedKey = await unwrapDataKey(bundle, passphrase);
    notify();
  }, []);

  const lock = useCallback(async (wipeLocal: boolean) => {
    sharedKey = null;
    if (wipeLocal) {
      await idbDel(BUNDLE_KEY).catch(() => {});
      hasStoredBundle = false;
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
    encryptText,
    decryptText,
    getCurrentKey: () => sharedKey,
  };
}

// SECURITY NOTE: Consider integrating an Argon2id-based derive flow for high-risk users; PBKDF2 iteration count is set high for baseline protection.
