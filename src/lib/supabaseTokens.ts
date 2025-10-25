import { parseSupabaseCookie } from '@supabase/auth-helpers-shared';

const AUTH_COOKIE_PATTERN = /auth[-.]token/i;
const DIRECT_TOKEN_PATTERN = /^(.*?)-(access|refresh)-token$/i;

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

function readDirectTokenPairs(reader: CookieReader): TokenPair {
  const fromExactNames = {
    accessToken: reader.get('sb-access-token')?.value ?? null,
    refreshToken: reader.get('sb-refresh-token')?.value ?? null,
  } satisfies TokenPair;

  if (fromExactNames.accessToken && fromExactNames.refreshToken) {
    return fromExactNames;
  }

  const grouped = new Map<string, TokenPair>();
  for (const cookie of reader.getAll()) {
    const match = cookie.name.match(DIRECT_TOKEN_PATTERN);
    if (!match) continue;

    const [, prefix, kind] = match;
    const bucket = grouped.get(prefix) ?? { accessToken: null, refreshToken: null };
    if (kind.toLowerCase() === 'access') {
      bucket.accessToken = bucket.accessToken ?? cookie.value;
    } else {
      bucket.refreshToken = bucket.refreshToken ?? cookie.value;
    }
    grouped.set(prefix, bucket);
  }

  for (const pair of grouped.values()) {
    if (pair.accessToken && pair.refreshToken) {
      return pair;
    }
  }

  return { accessToken: null, refreshToken: null };
}

export function readSupabaseTokensFromCookies(reader: CookieReader): TokenPair {
  const directTokens = readDirectTokenPairs(reader);
  if (directTokens.accessToken && directTokens.refreshToken) {
    return directTokens;
  }

  const grouped = groupAuthCookies(reader);
  for (const cookies of grouped.values()) {
    const ordered = sortChunkNames(cookies);
    if (!ordered.length) continue;

    const serialized = ordered.map(({ value }) => value).join('');
    const tokens = tokensFromSerializedSession(serialized);
    if (tokens.accessToken && tokens.refreshToken) {
      return tokens;
    }
  }

  return { accessToken: null, refreshToken: null };
}
