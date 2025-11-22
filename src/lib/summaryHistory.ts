// src/lib/summaryHistory.ts
// SECURITY: Stores generated stories locally in IndexedDB encrypted with the user's vault key.

import { encryptText, decryptText } from "@/lib/crypto";
import { idbGet, idbSet } from "@/lib/localVault";

export type StoredSummary = {
  id: string;
  createdAt: string;
  from?: string;
  to?: string;
  period?: string;
  cipher_b64: string;
  iv_b64: string;
};

function storageKey(userId: string) {
  return `oneline.v1.summary-history.${userId}`;
}

export async function persistSummary(
  userId: string,
  key: CryptoKey,
  story: string,
  meta: { from?: string; to?: string; period?: string },
) {
  const trimmed = story.trim();
  if (!trimmed) return;

  const { cipher_b64, iv_b64 } = await encryptText(key, trimmed);
  const existing = (await idbGet<StoredSummary[]>(storageKey(userId))) ?? [];
  const entry: StoredSummary = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    from: meta.from,
    to: meta.to,
    period: meta.period,
    cipher_b64,
    iv_b64,
  };

  const next = [entry, ...existing].slice(0, 50);
  await idbSet(storageKey(userId), next);
}

export async function loadSummaries(userId: string, key: CryptoKey) {
  const stored = (await idbGet<StoredSummary[]>(storageKey(userId))) ?? [];
  const decrypted = [] as { id: string; createdAt: string; from?: string; to?: string; period?: string; text: string }[];

  for (const item of stored) {
    try {
      const text = await decryptText(key, item.cipher_b64, item.iv_b64);
      decrypted.push({
        id: item.id,
        createdAt: item.createdAt,
        from: item.from,
        to: item.to,
        period: item.period,
        text,
      });
    } catch {
      // Skip unreadable entries; they likely belong to a different vault key.
    }
  }

  return decrypted;
}

