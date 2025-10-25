// src/app/api/history/route.ts
// SECURITY: Returns ciphertext/IV pairs only; plaintext never leaves the client.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

type TextSearchType = 'plain' | 'phrase' | 'websearch';
type SearchableColumn = 'content' | 'content_tsv';

const VALID_TEXT_SEARCH_TYPES: ReadonlySet<TextSearchType> = new Set([
  'plain',
  'phrase',
  'websearch',
]);
const SEARCHABLE_COLUMNS: ReadonlySet<SearchableColumn> = new Set(['content', 'content_tsv']);

function resolveSearchType(value: string | null | undefined): TextSearchType | undefined {
  if (!value) return undefined;
  return VALID_TEXT_SEARCH_TYPES.has(value as TextSearchType)
    ? (value as TextSearchType)
    : undefined;
}

function resolveSearchColumn(value: string | null | undefined): SearchableColumn {
  if (value && SEARCHABLE_COLUMNS.has(value as SearchableColumn)) {
    return value as SearchableColumn;
  }
  return 'content';
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sb = await supabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await sb.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ entries: [] }, { status: 401 });
  }

  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const rawSearch = url.searchParams.get('search')?.trim() || '';
  const rawQuery = url.searchParams.get('query')?.trim() || '';
  const textQuery = rawQuery || rawSearch;
  const searchColumn = resolveSearchColumn(url.searchParams.get('column')?.trim() || undefined);
  const config = url.searchParams.get('config')?.trim() || undefined;
  const searchType = resolveSearchType(url.searchParams.get('type')?.trim() || undefined);

  let query = sb
    .from('journal')
    .select('id, created_at, day, content_cipher, iv, content')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (from) {
    query = query.gte('day', from);
  }
  if (to) {
    query = query.lte('day', to);
  }
  if (textQuery) {
    query = query.textSearch(searchColumn, textQuery, {
      config,
      type: searchType,
    });
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entries: data ?? [] }, { headers: { 'cache-control': 'no-store' } });
}

// SECURITY WARNING: Consumers must decrypt client-side. Losing the passphrase means this data is unreadable forever.
