// src/lib/summaryHistory.ts
// SECURITY: Stores generated stories in Supabase encrypted with the user's vault key.

import { encryptText, decryptText } from "@/lib/crypto";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export type StoredSummary = {
  id: string;
  createdAt: string;
  from?: string;
  to?: string;
  period?: string;
  cipher_b64: string;
  iv_b64: string;
};

type SupabaseSummaryRow = {
  id: string;
  created_at: string;
  user_id: string;
  from_date: string | null;
  to_date: string | null;
  period: string | null;
  cipher_b64: string;
  iv_b64: string;
};

export async function persistSummary(
  userId: string,
  key: CryptoKey,
  story: string,
  meta: { from?: string; to?: string; period?: string },
) {
  const trimmed = story.trim();
  if (!trimmed) return;

  const { cipher_b64, iv_b64 } = await encryptText(key, trimmed);
  const supabase = supabaseBrowser();

  const payload = {
    user_id: userId,
    from_date: meta.from ?? null,
    to_date: meta.to ?? null,
    period: meta.period ?? null,
    cipher_b64,
    iv_b64,
  };

  // NOTE: Supabase client typing does not yet include the summary_histories table. Cast to any
  // so we can insert while keeping runtime behavior intact until generated types are added.
  const { error } = await (supabase as any).from("summary_histories").insert(payload);

  if (error) {
    throw new Error(error.message || "Unable to save summary history.");
  }
}

export async function loadSummaries(userId: string, key: CryptoKey) {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from("summary_histories")
    .select("id, created_at, from_date, to_date, period, cipher_b64, iv_b64")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message || "Unable to load summary history.");
  }

  const stored = (data ?? []) as SupabaseSummaryRow[];
  const decrypted = [] as { id: string; createdAt: string; from?: string; to?: string; period?: string; text: string }[];

  for (const item of stored) {
    try {
      const text = await decryptText(key, item.cipher_b64, item.iv_b64);
      decrypted.push({
        id: item.id,
        createdAt: item.created_at,
        from: item.from_date ?? undefined,
        to: item.to_date ?? undefined,
        period: item.period ?? undefined,
        text,
      });
    } catch {
      // Skip unreadable entries; they likely belong to a different vault key.
    }
  }

  return decrypted;
}

export async function deleteSummary(userId: string, id: string) {
  const supabase = supabaseBrowser();
  const { error } = await supabase.from("summary_histories").delete().eq("user_id", userId).eq("id", id);

  if (error) {
    throw new Error(error.message || "Unable to delete this summary.");
  }
}

