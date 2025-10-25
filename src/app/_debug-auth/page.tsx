import { Suspense } from 'react';
import { createServerSupabase } from '@/lib/supabase/server';
import ClientSessionState from './ClientSessionState';

export const dynamic = 'force-dynamic';

export default async function DebugAuthPage() {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <main style={{ padding: 24, fontFamily: 'ui-sans-serif' }}>
      <h1>Auth Debug</h1>
      <pre>SERVER hasSession: {String(!!session)}</pre>
      <pre>SERVER user id: {session?.user?.id ?? '-'}</pre>
      <pre>SERVER email: {session?.user?.email ?? '-'}</pre>
      <Suspense fallback={<p>CLIENT loading…</p>}>
        <ClientSessionState />
      </Suspense>
    </main>
  );
}
