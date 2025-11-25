/**
 * scripts/test-unlock.ts
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   TEST_USER_ID="956c097d-206a-42e2-afcf-924b0dXXXX" \
 *   TEST_PASSPHRASE="AAG200811291709" \
 *   npx ts-node scripts/test-unlock.ts
 *
 * The script fetches the wrapped vault bundle for the user from Supabase and
 * attempts to unwrap it with the same PBKDF2 + AES-GCM logic used in the app.
 * On success it prints the unwrapped key length only; secrets are never logged.
 */

import { webcrypto } from 'crypto';
import type { PostgrestError } from '@supabase/supabase-js';
import { supabaseAdmin } from '../src/lib/supabaseAdmin';
import { unwrapDataKey, type WrappedBundle } from '../src/lib/crypto';

const DEFAULT_USER_ID = '956c097d-206a-42e2-afcf-924b0dXXXX';
const DEFAULT_PASSPHRASE = 'AAG200811291709';
const TABLE = 'user_vaults';

type VaultRow = Pick<WrappedBundle, 'wrapped_b64' | 'iv_b64' | 'salt_b64' | 'version'> & { user_id: string };

function ensureWebCrypto() {
  if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.subtle) {
    (globalThis as typeof globalThis & { crypto: typeof webcrypto }).crypto = webcrypto as typeof globalThis.crypto;
  }
  if (typeof globalThis.atob === 'undefined') {
    globalThis.atob = (data: string) => Buffer.from(data, 'base64').toString('binary');
  }
  if (typeof globalThis.btoa === 'undefined') {
    globalThis.btoa = (data: string) => Buffer.from(data, 'binary').toString('base64');
  }
}

async function fetchVaultBundle(userId: string): Promise<VaultRow> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from(TABLE)
    .select('user_id, wrapped_b64, iv_b64, salt_b64, version')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase error: ${(error as PostgrestError).message}`);
  }
  if (!data) {
    throw new Error('No vault bundle found for user');
  }
  return data;
}

async function main() {
  ensureWebCrypto();

  const userId = process.env.TEST_USER_ID ?? DEFAULT_USER_ID;
  const passphrase = process.env.TEST_PASSPHRASE ?? DEFAULT_PASSPHRASE;

  try {
    const bundle = await fetchVaultBundle(userId);
    const key = await unwrapDataKey(bundle, passphrase);
    const raw = await crypto.subtle.exportKey('raw', key);
    console.log(`Unwrap OK: dataKey length = ${raw.byteLength} bytes`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`Unwrap FAILED: ${message}`);
  }
}

main();
