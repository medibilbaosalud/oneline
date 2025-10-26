import { parseSupabaseCookie } from '@supabase/auth-helpers-shared';

const AUTH_COOKIE_PATTERN = /auth[-.]token/i;
const DIRECT_TOKEN_PATTERN = /^(.*?)-(access|refresh)-token$/i;

type MaybeProjectRef = string | null | undefined;

let cachedProjectRef: string | null | undefined;

export function getSupabaseProjectRef(): string | null {
  if (cachedProjectRef !== undefined) {
    return cachedProjectRef;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    cachedProjectRef = null;
    return cachedProjectRef;
  }

  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.endsWith('.supabase.co') || host.endsWith('.supabase.in')) {
      const segments = host.split('.');
      cachedProjectRef = segments.length > 0 ? segments[0] : null;
      return cachedProjectRef;
    }
  } catch {
    // ignore URL parse failures and fall through to null
  }

  cachedProjectRef = null;
  return cachedProjectRef;
}

function sortChunkNames(names: Array<{ name: string; value: string }>) {
  return names
    .map(({ name, value }) => {
      const match = name.match(/^(.*?)(?:\.(\d+))?$/);
      if (!match) {
        return { base: name, index: Number.POSITIVE_INFINITY, value };
      }
      const [, base, index] = match;
      return {
        base,
        index: index === undefined ? Number.NEGATIVE_INFINITY : Number.parseInt(index, 10),
        value,
      };
    })
    .sort((a, b) => {
      if (a.base === b.base) {
        return a.index - b.index;
      }
      return a.base.localeCompare(b.base);
    });
}

type CookieReader = {
  get(name: string): { value: string } | undefined;
  getAll(): Array<{ name: string; value: string }>;
};

type TokenPair = { accessToken: string | null; refreshToken: string | null };

function tokensFromSerializedSession(serialized: string | null | undefined): TokenPair {
  if (!serialized) {
    return { accessToken: null, refreshToken: null };
  }

  try {
    const parsed = parseSupabaseCookie(serialized);
    const accessToken = typeof parsed?.access_token === 'string' ? parsed.access_token : null;
    const refreshToken = typeof parsed?.refresh_token === 'string' ? parsed.refresh_token : null;
    if (accessToken && refreshToken) {
      return { accessToken, refreshToken };
    }
  } catch {
    // ignore parse failures and fall through to nulls
  }

  return { accessToken: null, refreshToken: null };
}

function groupAuthCookies(reader: CookieReader) {
  const groups = new Map<string, Array<{ name: string; value: string }>>();
  for (const cookie of reader.getAll()) {
    if (!AUTH_COOKIE_PATTERN.test(cookie.name)) continue;
    const baseName = cookie.name.replace(/\.(\d+)$/, '');
    const existing = groups.get(baseName) ?? [];
    existing.push(cookie);
    groups.set(baseName, existing);
  }
  return groups;
}

type TokenCandidate = { tokens: TokenPair; priority: number };

function normalizePrefix(prefix: string | null | undefined): string | null {
  if (!prefix) return null;
  return prefix.trim().toLowerCase() || null;
}

function projectPriority(prefix: string | null, projectRef: MaybeProjectRef): number {
  const normalizedPrefix = normalizePrefix(prefix);
  if (!normalizedPrefix) return 0;

  if (projectRef) {
    const normalizedProject = projectRef.trim().toLowerCase();
    const target = `sb-${normalizedProject}`;
    if (normalizedPrefix === target) {
      return 4;
    }
  }

  if (normalizedPrefix.startsWith('sb-')) {
    return 2;
  }

  return 1;
}

function chooseBestCandidate(candidates: TokenCandidate[]): TokenPair {
  let best: TokenPair = { accessToken: null, refreshToken: null };
  let bestPriority = Number.NEGATIVE_INFINITY;

  for (const candidate of candidates) {
    const { tokens, priority } = candidate;
    if (!tokens.accessToken || !tokens.refreshToken) continue;
    if (priority > bestPriority) {
      best = tokens;
      bestPriority = priority;
    }
  }

  return best;
}

function readDirectTokenPairs(reader: CookieReader, projectRef: MaybeProjectRef): TokenPair {
  const candidates: TokenCandidate[] = [];

  const fromExactNames = {
    accessToken: reader.get('sb-access-token')?.value ?? null,
    refreshToken: reader.get('sb-refresh-token')?.value ?? null,
  } satisfies TokenPair;

  candidates.push({ tokens: fromExactNames, priority: projectRef ? 3 : 2 });

  const grouped = new Map<string, TokenPair>();
  for (const cookie of reader.getAll()) {
    const match = cookie.name.match(DIRECT_TOKEN_PATTERN);
    if (!match) continue;

    const [, rawPrefix, kind] = match;
    const prefix = rawPrefix ?? '';
    const bucket = grouped.get(prefix) ?? { accessToken: null, refreshToken: null };
    if (kind.toLowerCase() === 'access') {
      bucket.accessToken = bucket.accessToken ?? cookie.value;
    } else {
      bucket.refreshToken = bucket.refreshToken ?? cookie.value;
    }
    grouped.set(prefix, bucket);
  }

  for (const [prefix, pair] of grouped.entries()) {
    candidates.push({ tokens: pair, priority: projectPriority(prefix, projectRef) });
  }

  return chooseBestCandidate(candidates);
}

export function readSupabaseTokensFromCookies(
  reader: CookieReader,
  { projectRef }: { projectRef?: MaybeProjectRef } = {},
): TokenPair {
  const scopedRef = projectRef ?? null;
  const directTokens = readDirectTokenPairs(reader, scopedRef);
  if (directTokens.accessToken && directTokens.refreshToken) {
    return directTokens;
  }

  const chunkCandidates: TokenCandidate[] = [];
  const grouped = groupAuthCookies(reader);
  for (const [baseName, cookies] of grouped.entries()) {
    const ordered = sortChunkNames(cookies);
    if (!ordered.length) continue;

    const serialized = ordered.map(({ value }) => value).join('');
    const tokens = tokensFromSerializedSession(serialized);
    chunkCandidates.push({ tokens, priority: projectPriority(baseName, scopedRef) });
  }

  const chunkTokens = chooseBestCandidate(chunkCandidates);
  if (chunkTokens.accessToken && chunkTokens.refreshToken) {
    return chunkTokens;
  }

  return { accessToken: null, refreshToken: null };
}
