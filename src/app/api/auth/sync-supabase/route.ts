import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

import { authOptions } from '../[...nextauth]/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.googleIdToken) {
    return NextResponse.json({ linked: false, reason: 'no-google-session' }, { status: 200 });
  }

  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session: existingSession },
  } = await supabase.auth.getSession();

  if (existingSession?.user) {
    return NextResponse.json({ linked: true, reason: 'already-linked' }, { status: 200 });
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: session.googleIdToken,
  });

  if (error) {
    console.error('[auth:sync-supabase] signInWithIdToken failed', error);
    return NextResponse.json(
      { linked: false, reason: 'supabase-error', message: error.message },
      { status: 401 },
    );
  }

  return NextResponse.json({ linked: true, reason: 'linked' }, { status: 200 });
}
