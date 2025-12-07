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
  imageUrl?: string;
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
  image_url: string | null;
};

/**
 * Upload a story cover image to Supabase Storage.
 * Returns the public URL of the uploaded image.
 */
export async function uploadStoryImage(
  userId: string,
  imageBase64: string,
): Promise<string | null> {
  if (!imageBase64) return null;

  try {
    const supabase = supabaseBrowser();

    // Convert base64 to binary
    const binaryString = atob(imageBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "image/png" });

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${userId}/${timestamp}.png`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("story-images")
      .upload(filename, blob, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error("Image upload failed:", uploadError);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("story-images")
      .getPublicUrl(filename);

    return urlData?.publicUrl ?? null;
  } catch (err) {
    console.error("Image upload error:", err);
    return null;
  }
}

export async function persistSummary(
  userId: string,
  key: CryptoKey,
  story: string,
  meta: { from?: string; to?: string; period?: string; imageUrl?: string },
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
    image_url: meta.imageUrl ?? null,
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
    .select("id, created_at, from_date, to_date, period, cipher_b64, iv_b64, image_url")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message || "Unable to load summary history.");
  }

  const stored = (data ?? []) as SupabaseSummaryRow[];
  const decrypted = [] as { id: string; createdAt: string; from?: string; to?: string; period?: string; text: string; imageUrl?: string }[];

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
        imageUrl: item.image_url ?? undefined,
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

