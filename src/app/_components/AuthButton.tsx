'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type SbUser = {
  id: string;
  email?: string;
};

export default function AuthButton() {
  const supabase = useMemo(() => createClientComponentClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SbUser | null>(null);

  // Carga el usuario actual y escucha cambios de sesión
  useEffect(() => {
    let isMounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!isMounted) return;
      setUser(data.user ? { id: data.user.id, email: data.user.email ?? undefined } : null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email ?? undefined } : null);
      // Refresca el árbol del App Router para que el UI (TopNav) se actualice
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        router.refresh();
      }
    });

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="text-sm text-neutral-400 px-2 py-1">
        …
      </div>
    );
  }

  if (!user) {
    return (
      <Link
        href="/auth/login"
        className="rounded-md bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-400"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden sm:inline text-sm text-neutral-300">
        {user.email ?? 'Account'}
      </span>
      <button
        onClick={async () => {
          await supabase.auth.signOut();
          router.refresh();
        }}
        className="rounded-md bg-neutral-800 px-3 py-2 text-sm text-white hover:bg-neutral-700"
      >
        Sign out
      </button>
    </div>
  );
}
