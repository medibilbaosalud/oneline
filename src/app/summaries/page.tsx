// src/app/summaries/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import SummariesClient from './SummariesClient';

type Summary = {
  id: string;
  period: string;
  start_date: string;
  end_date: string;
  html: string;
  created_at: string;
  user_id: string;
};

export default async function SummariesPage() {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  // Si no hay sesión, devolvemos lista vacía (o rediriges si prefieres)
  const { data: { user } } = await supabase.auth.getUser();
  let items: Summary[] = [];

  if (user) {
    const { data } = await supabase
      .from('summaries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    items = (data ?? []) as Summary[];
  }

  // Pasamos los datos a un componente cliente para la UI
  return <SummariesClient items={items} />;
}
