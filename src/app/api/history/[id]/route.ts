import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteParams = { id: string };
type RouteContext = {
  params: RouteParams | Promise<RouteParams> | undefined;
};

type PatchBody = {
  content_cipher?: string;
  iv?: string;
};

async function resolveParams(context: RouteContext): Promise<RouteParams | null> {
  const { params } = context ?? {};

  if (!params) {
    return null;
  }

  if (typeof (params as Promise<RouteParams>).then === 'function') {
    return params as Promise<RouteParams>;
  }

  return params as RouteParams;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const s = await supabaseServer();
    const {
      data: { user },
    } = await s.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    }

    const params = await resolveParams(context);
    if (!params?.id) {
      return NextResponse.json({ error: 'invalid params' }, { status: 400 });
    }

    const { id } = params;
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

    return NextResponse.json(
      { ok: true },
      { headers: { 'cache-control': 'no-store' } }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const s = await supabaseServer();
    const {
      data: { user },
    } = await s.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    }

    const params = await resolveParams(context);
    if (!params?.id) {
      return NextResponse.json({ error: 'invalid params' }, { status: 400 });
    }

    const { id } = params;
    const { data, error } = await s
      .from('journal')
      .delete()
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

    return NextResponse.json(
      { ok: true },
      { headers: { 'cache-control': 'no-store' } }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
