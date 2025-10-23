import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PatchBody = {
  content_cipher?: string;
  iv?: string;
};

type RouteParams =
  | { params: { id?: string | null | undefined } }
  | { params: Promise<{ id: string }> };

const UUID_REGEXP =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isPromise<T>(value: unknown): value is Promise<T> {
  return Boolean(value) && typeof (value as Promise<T>).then === 'function';
}

async function resolveId(context: RouteParams): Promise<string | null> {
  const rawParams = context?.params;
  const params = isPromise<{ id?: string }>(rawParams) ? await rawParams : rawParams;
  const id = params?.id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

function assertUuid(id: string | null): id is string {
  return typeof id === 'string' && UUID_REGEXP.test(id);
}

export async function PATCH(req: NextRequest, context: RouteParams) {
  try {
    const s = await supabaseServer();
    const {
      data: { user },
    } = await s.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    }

    const id = await resolveId(context);
    if (!assertUuid(id)) {
      return NextResponse.json({ error: 'invalid id' }, { status: 400 });
    }

    const body = (await req.json().catch(() => null)) as PatchBody | null;

    if (!body?.content_cipher || !body?.iv) {
      return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
    }

    const { data, error } = await s
      .from('journal')
      .update({
        content_cipher: body.content_cipher,
        iv: body.iv,
        version: 1,
        content: null,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteParams) {
  try {
    const s = await supabaseServer();
    const {
      data: { user },
    } = await s.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    }

    const id = await resolveId(context);
    if (!assertUuid(id)) {
      return NextResponse.json({ error: 'invalid id' }, { status: 400 });
    }

    const { data: removedRow, error } = await s
      .from('journal')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!removedRow) {
      // The delete call reported no matching rows; confirm whether it still exists.
      const { data: stillThere, error: checkErr } = await s
        .from('journal')
        .select('id')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkErr) {
        return NextResponse.json({ error: checkErr.message }, { status: 500 });
      }

      if (!stillThere) {
        return new NextResponse(null, {
          status: 204,
          headers: { 'cache-control': 'no-store' },
        });
      }

      return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
    }

    return new NextResponse(null, {
      status: 204,
      headers: { 'cache-control': 'no-store' },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
