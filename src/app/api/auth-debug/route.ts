import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cookieNames = cookies()
    .getAll()
    .map((cookie) => cookie.name);

  const supabase = createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return NextResponse.json({
    cookieNames,
    hasSession: !!session,
    userId: session?.user?.id ?? null,
    email: session?.user?.email ?? null,
  });
}
