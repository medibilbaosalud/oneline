import type { SummaryFrequency, SummaryLength } from "@/lib/summaryPreferences";

export type JournalDigestFreq = SummaryFrequency;
export type JournalStoryLength = SummaryLength;

export interface JournalRow {
  id: string;
  user_id: string;
  content: string | null;
  content_cipher: string | null;
  iv: string | null;
  version: number | null;
  day: string | null;
  digest_frequency: JournalDigestFreq;
  story_length: JournalStoryLength;
}
