'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function AuthButton() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<null | { id: string }>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user ?? null);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [supabase]);

  if (loading) {
    return (
      <div className="h-8 w-16 rounded bg-neutral-800/70 animate-pulse" />
    );
  }

  if (!user) {
    // Sin sesión → link a /login (magic link)
    return (
      <Link
        href="/login"
        className="rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium hover:bg-indigo-400"
      >
        Sign in
      </Link>
    );
  }

  // Con sesión → botón para cerrar sesión
  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        router.refresh(); // refresca el layout para que cambie el botón
      }}
      className="rounded-lg bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700"
    >
      Sign out
    </button>
  );
}
