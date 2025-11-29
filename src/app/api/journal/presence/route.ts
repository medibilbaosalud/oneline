// src/app/api/journal/presence/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ present: false }, { status: 401 });
    }

    const { count, error } = await supabase
      .from('journal')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ present: true }, { status: 500 });
    }

    // If count is null, treat it as uncertain and assume presence to avoid false negatives.
    if (count === null) {
      return NextResponse.json({ present: true }, { status: 503 });
    }

    return NextResponse.json({ present: (count ?? 0) > 0 });
  } catch (error) {
    return NextResponse.json({ present: true }, { status: 500 });
  }
}
