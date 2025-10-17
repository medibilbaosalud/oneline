'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

export default function AuthButton() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setEmail(data.session?.user?.email ?? null);
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
      router.refresh(); // refresca server components (nav, etc.)
    });

    return () => {
      mounted = false;
      sub?.subscription.unsubscribe();
    };
  }, [supabase, router]);

  if (loading) {
    return (
      <button
        className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300"
        disabled
      >
        …
      </button>
    );
  }

  if (!email) {
    const next = encodeURIComponent(pathname || '/today');
    return (
      <Link
        href={`/auth?next=${next}`}
        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-neutral-300 hidden sm:inline">{email}</span>
      <button
        onClick={async () => {
          await supabase.auth.signOut();
          router.replace('/today');
          router.refresh();
        }}
        className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700"
      >
        Sign out
      </button>
    </div>
  );
}
