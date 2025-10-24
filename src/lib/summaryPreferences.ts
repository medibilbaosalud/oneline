const SUMMARY_LENGTHS = ['short', 'medium', 'long'] as const;
const SUMMARY_TONES = ['auto', 'warm', 'neutral', 'poetic', 'direct'] as const;
const SUMMARY_POVS = ['auto', 'first', 'third'] as const;
const FREQUENCIES = ['weekly', 'monthly', 'yearly'] as const;

export type SummaryLength = typeof SUMMARY_LENGTHS[number];
export type SummaryTone = typeof SUMMARY_TONES[number];
export type SummaryPov = typeof SUMMARY_POVS[number];
export type SummaryFrequency = typeof FREQUENCIES[number];

export type SummaryPreferences = {
  length: SummaryLength;
  tone: SummaryTone;
  pov: SummaryPov;
  includeHighlights: boolean;
  notes: string | null;
};

export type SummaryReminder = {
  due: boolean;
  period: SummaryFrequency;
  window: { start: string; end: string };
  dueSince: string | null;
  lastSummaryAt: string | null;
};

export const DEFAULT_SUMMARY_PREFERENCES: SummaryPreferences = {
  length: 'medium',
  tone: 'auto',
  pov: 'auto',
  includeHighlights: true,
  notes: null,
};

function isSummaryLength(value: unknown): value is SummaryLength {
  return typeof value === 'string' && SUMMARY_LENGTHS.includes(value as SummaryLength);
}

function isSummaryTone(value: unknown): value is SummaryTone {
  return typeof value === 'string' && SUMMARY_TONES.includes(value as SummaryTone);
}

function isSummaryPov(value: unknown): value is SummaryPov {
  return typeof value === 'string' && SUMMARY_POVS.includes(value as SummaryPov);
}

export function isSummaryFrequency(value: unknown): value is SummaryFrequency {
  return typeof value === 'string' && FREQUENCIES.includes(value as SummaryFrequency);
}

function sanitizeNotes(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 1000);
}

export function coerceSummaryPreferences(input: unknown): SummaryPreferences {
  if (!input || typeof input !== 'object') {
    return { ...DEFAULT_SUMMARY_PREFERENCES };
  }

  const source = input as Record<string, unknown>;
  const lengthSource = source.length ?? source.summary_length;
  const toneSource = source.tone ?? source.summary_tone;
  const povSource = source.pov ?? source.summary_pov;
  const includeSource = source.includeHighlights ?? source.include_highlights;
  const notesSource = source.notes ?? source.summary_notes;

  return {
    length: isSummaryLength(lengthSource) ? lengthSource : DEFAULT_SUMMARY_PREFERENCES.length,
    tone: isSummaryTone(toneSource) ? toneSource : DEFAULT_SUMMARY_PREFERENCES.tone,
    pov: isSummaryPov(povSource) ? povSource : DEFAULT_SUMMARY_PREFERENCES.pov,
    includeHighlights:
      typeof includeSource === 'boolean' ? includeSource : DEFAULT_SUMMARY_PREFERENCES.includeHighlights,
    notes: sanitizeNotes(notesSource),
  };
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfWeekUtc(date: Date) {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = result.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  result.setUTCDate(result.getUTCDate() - diffToMonday);
  return result;
}

export function computeSummaryReminder(
  frequency: SummaryFrequency,
  lastSummaryAt: string | null,
  now: Date = new Date(),
): SummaryReminder {
  const reference = new Date(now);
  const currentStart = (() => {
    if (frequency === 'weekly') {
      return startOfWeekUtc(reference);
    }
    if (frequency === 'monthly') {
      return new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1));
    }
    return new Date(Date.UTC(reference.getUTCFullYear(), 0, 1));
  })();

  const previousWindow = (() => {
    if (frequency === 'weekly') {
      const end = new Date(currentStart.getTime() - 1);
      const start = new Date(currentStart.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { start, end };
    }
    if (frequency === 'monthly') {
      const start = new Date(Date.UTC(currentStart.getUTCFullYear(), currentStart.getUTCMonth() - 1, 1));
      const end = new Date(Date.UTC(currentStart.getUTCFullYear(), currentStart.getUTCMonth(), 0, 23, 59, 59, 999));
      return { start, end };
    }
    const start = new Date(Date.UTC(currentStart.getUTCFullYear() - 1, 0, 1));
    const end = new Date(Date.UTC(currentStart.getUTCFullYear(), 0, 0, 23, 59, 59, 999));
    return { start, end };
  })();

  const last = lastSummaryAt ? new Date(lastSummaryAt) : null;
  const due = !last || last.getTime() < currentStart.getTime();

  return {
    due,
    period: frequency,
    window: {
      start: isoDate(previousWindow.start),
      end: isoDate(previousWindow.end),
    },
    dueSince: due ? isoDate(previousWindow.end) : null,
    lastSummaryAt,
  };
}
