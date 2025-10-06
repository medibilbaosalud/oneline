import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function GET(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ entry: null, error: 'unauthenticated' }, { status: 401 })

  // Trae la entrada de HOY
  const today = new Date().toISOString().slice(0,10) // YYYY-MM-DD
  const { data, error } = await supabase
    .from('journal')
    .select('*')
    .eq('user_id', user.id)
    .eq('day', today)
    .maybeSingle()

  if (error) return NextResponse.json({ entry: null, error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data })
}

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }

  const content = (body?.content ?? '').toString()
  const day = new Date().toISOString().slice(0,10)

  // upsert por (user_id, day)
  const { data, error } = await supabase
    .from('journal')
    .upsert({ user_id: user.id, day, content })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, entry: data })
}
