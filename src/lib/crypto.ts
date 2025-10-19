// src/lib/crypto.ts
// SECURITY: Client-side helpers for per-user end-to-end encryption. Never persist raw passphrases or decrypted text.

export type B64 = string;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/** Encode a Uint8Array into base64 for transport/storage. */
export function toB64(bytes: Uint8Array): B64 {
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function toArrayBufferView(bytes: Uint8Array): ArrayBuffer {
  if (bytes.buffer instanceof ArrayBuffer && bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength) {
    return bytes.buffer;
  }
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

/** Decode a base64 string back into a Uint8Array. */
export function fromB64(b64: B64): Uint8Array {
  const binary = atob(b64);
  const backing = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(backing);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Generate a random salt (16 bytes by default) encoded as base64. */
export async function generateSalt(byteLength = 16): Promise<B64> {
  const salt = crypto.getRandomValues(new Uint8Array(byteLength));
  return toB64(salt);
}

/**
 * Derive an AES-GCM CryptoKey from a human passphrase using PBKDF2.
 * Returns both the key and the raw base64 material (for optional secure storage).
 */
export async function deriveKeyFromPassword(
  passphrase: string,
  saltB64: B64,
  iterations = 200_000,
): Promise<{ key: CryptoKey; rawBase64: B64 }> {
  const salt = fromB64(saltB64);
  const baseKey = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey', 'deriveBits'],
  );
  const saltBuffer = toArrayBufferView(salt);
  const derivedKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBuffer, iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
  const rawBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBuffer, iterations, hash: 'SHA-256' },
    baseKey,
    256,
  );
  return { key: derivedKey, rawBase64: toB64(new Uint8Array(rawBits)) };
}

/**
 * Encrypt a short text payload using AES-GCM. Returns cipher + IV in base64.
 */
export async function encryptText(
  key: CryptoKey,
  plainText: string,
): Promise<{ cipher_b64: B64; iv_b64: B64 }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    textEncoder.encode(plainText),
  );
  return {
    cipher_b64: toB64(new Uint8Array(cipherBuffer)),
    iv_b64: toB64(iv),
  };
}

/**
 * Decrypt an AES-GCM payload using the provided CryptoKey.
 */
export async function decryptText(key: CryptoKey, cipher_b64: B64, iv_b64: B64): Promise<string> {
  const cipherBytes = fromB64(cipher_b64);
  const ivBytes = fromB64(iv_b64);
  const ivForDecrypt = new Uint8Array(toArrayBufferView(ivBytes));
  const cipherForDecrypt = new Uint8Array(toArrayBufferView(cipherBytes));
  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivForDecrypt },
    key,
    cipherForDecrypt,
  );
  return textDecoder.decode(plainBuffer);
}

/**
 * Generate a random symmetric data key (AES-GCM 256) for encrypting journal entries.
 */
export async function generateDataKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

/**
 * Derive a key-encryption-key (KEK) from a passphrase to wrap the data key.
 * SECURITY: PBKDF2 is used here; consider Argon2id via WASM for stronger resistance on powerful clients.
 */
export async function deriveKEKFromPassphrase(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', textEncoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  const saltBuffer = toArrayBufferView(salt);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBuffer, iterations: 200_000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey', 'unwrapKey'],
  );
}

export type WrappedBundle = {
  wrapped_b64: B64;
  iv_b64: B64;
  salt_b64: B64;
  version: number;
};

/**
 * Wrap (encrypt) a generated data key with the user's passphrase-derived KEK.
 */
export async function wrapDataKey(dataKey: CryptoKey, passphrase: string): Promise<WrappedBundle> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const kek = await deriveKEKFromPassphrase(passphrase, salt);
  const wrapped = await crypto.subtle.wrapKey('raw', dataKey, kek, { name: 'AES-GCM', iv });
  return {
    wrapped_b64: toB64(new Uint8Array(wrapped)),
    iv_b64: toB64(iv),
    salt_b64: toB64(salt),
    version: 1,
  };
}

/**
 * Unwrap a stored bundle into a CryptoKey using the provided passphrase.
 */
export async function unwrapDataKey(bundle: WrappedBundle, passphrase: string): Promise<CryptoKey> {
  const salt = fromB64(bundle.salt_b64);
  const iv = fromB64(bundle.iv_b64);
  const wrapped = fromB64(bundle.wrapped_b64);
  const kek = await deriveKEKFromPassphrase(passphrase, salt);
  return crypto.subtle.unwrapKey(
    'raw',
    wrapped,
    kek,
    { name: 'AES-GCM', iv },
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
}

// Optional stronger derivation: integrate Argon2id (e.g. via @noble/hashes/argon2 or wasm) in future if users request it.
// SECURITY WARNING: Losing the passphrase or wrapped key means journal data is unrecoverable.
