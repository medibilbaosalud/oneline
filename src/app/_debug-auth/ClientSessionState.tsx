'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

type ClientState = {
  hasSession: boolean | null;
  id?: string | null;
  email?: string | null;
};

export default function ClientSessionState() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [state, setState] = useState<ClientState>({ hasSession: null });

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!active) return;
        setState({ hasSession: !!session, id: session?.user?.id ?? null, email: session?.user?.email ?? null });
      })
      .catch(() => {
        if (!active) return;
        setState({ hasSession: false, id: null, email: null });
      });

    return () => {
      active = false;
    };
  }, [supabase]);

  if (state.hasSession === null) {
    return <p>CLIENT loading…</p>;
  }

  return (
    <div>
      <pre>CLIENT hasSession: {String(state.hasSession)}</pre>
      <pre>CLIENT user id: {state.id ?? '-'}</pre>
      <pre>CLIENT email: {state.email ?? '-'}</pre>
    </div>
  );
}
