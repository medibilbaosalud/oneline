'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

export default function ClientSessionState() {
  const supabase = supabaseBrowser();
  const [hasSession, setHasSession] = useState<null | boolean>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth
      .getSession()
      .then((result) => {
        if (!mounted) return;
        setHasSession(!!result.data.session);
      })
      .catch(() => {
        if (!mounted) return;
        setHasSession(false);
      });
    return () => {
      mounted = false;
    };
  }, [supabase]);

  return (
    <pre className="overflow-auto rounded-xl bg-black/40 p-4 text-sm text-emerald-300">
      CLIENT hasSession: {hasSession === null ? 'loading…' : String(hasSession)}
    </pre>
  );
}
