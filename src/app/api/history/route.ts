import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const supabase = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
  });

export async function GET() {
  const cookieStore = cookies();
  const uid = cookieStore.get('uid')?.value; // adapta a tu auth si usas otra
  if (!uid) return NextResponse.json({ entries: [] });

  const { data, error } = await supabase()
    .from('journal')
    .select('id, content, created_at')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data ?? [] });
}