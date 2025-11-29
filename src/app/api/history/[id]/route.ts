import { NextRequest, NextResponse } from 'next/server';
import { createClient, type PostgrestError } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PatchBody = {
  content_cipher?: string;
  iv?: string;
};

type RouteParams = { params: Promise<{ id: string }> };

const UUID_REGEXP =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveUuid(id: string | null | undefined): string | null {
  if (typeof id !== 'string') return null;
  return UUID_REGEXP.test(id) ? id : null;
}

async function extractId(context: RouteParams): Promise<string | null> {
  const params = await context.params;
  return resolveUuid(params?.id);
}

function assertServiceEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return null;
  }
  return { url, key };
}

function mapPostgrestError(error: PostgrestError | null):
  | { status: number; payload: { error: string; detail?: string } }
  | null {
  if (!error) return null;
  const detail = error.details || error.message;
  const message = error.message || 'unexpected_error';
  const code = error.code || '';
  if (/row level security|permission denied/i.test(message) || code === '42501') {
    return { status: 403, payload: { error: 'rls_denied', detail } };
  }
  if (/foreign key|violates foreign key|constraint/i.test(message) || code === '23503') {
    return { status: 409, payload: { error: 'fk_constraint', detail } };
  }
  return { status: 500, payload: { error: 'unexpected_error', detail } };
}

function createServiceClient() {
  const env = assertServiceEnv();
  if (!env) {
    return null;
  }
  return createClient(env.url, env.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function requireUser() {
  const client = await supabaseServer();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) {
    return { user: null, client, error } as const;
  }
  return { user, client, error: null as null } as const;
}

export async function PATCH(req: NextRequest, context: RouteParams) {
  try {
    const { user, client, error: authErr } = await requireUser();
    if (authErr) {
      console.error('[history.patch] auth_error', authErr);
    }
    if (!user) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    }

    const id = await extractId(context);
    if (!id) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }

    const body = (await req.json().catch(() => null)) as PatchBody | null;
    if (!body?.content_cipher || !body?.iv) {
      return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
    }

    const { data, error } = await client
      .from('journal')
      .update({
        content_cipher: body.content_cipher,
        iv: body.iv,
        version: 1,
        content: '',
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('[history.patch] supabase_error', { id, error });
      const mapped = mapPostgrestError(error);
      if (mapped) {
        return NextResponse.json(mapped.payload, { status: mapped.status });
      }
      return NextResponse.json({ error: 'unexpected_error' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json(
      { ok: true },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (err) {
    console.error('[history.patch] fatal', err);
    const message = err instanceof Error ? err.message : 'unexpected_error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteParams) {
  try {
    const { user, client, error: authErr } = await requireUser();
    if (authErr) {
      console.error('[history.delete] auth_error', authErr);
    }
    if (!user) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    }

    const id = await extractId(context);
    if (!id) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }

    const service = createServiceClient();
    const deleter = service ?? client;

    const { data, error } = await deleter
      .from('journal')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('[history.delete] supabase_error', { id, error });
      const mapped = mapPostgrestError(error);
      if (mapped) {
        return NextResponse.json(mapped.payload, { status: mapped.status });
      }
      return NextResponse.json({ error: 'unexpected_error' }, { status: 500 });
    }

    if (!data) {
      if (service) {
        const { data: verify, error: verifyErr } = await service
          .from('journal')
          .select('id')
          .eq('id', id)
          .eq('user_id', user.id)
          .maybeSingle();
        if (verifyErr) {
          console.error('[history.delete] verify_error', { id, error: verifyErr });
          const mapped = mapPostgrestError(verifyErr);
          if (mapped) {
            return NextResponse.json(mapped.payload, { status: mapped.status });
          }
          return NextResponse.json({ error: 'unexpected_error' }, { status: 500 });
        }
        if (verify) {
          return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
        }
      }
    }

    return new NextResponse(null, {
      status: 204,
      headers: { 'cache-control': 'no-store' },
    });
  } catch (err) {
    console.error('[history.delete] fatal', err);
    if (err instanceof Error && /Missing env/i.test(err.message)) {
      return NextResponse.json(
        { error: 'env_missing', detail: err.message },
        { status: 500 },
      );
    }
    const message = err instanceof Error ? err.message : 'unexpected_error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
