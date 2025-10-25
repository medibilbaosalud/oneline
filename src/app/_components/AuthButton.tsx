'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabaseBrowser, syncServerAuth } from '@/lib/supabaseBrowser';

export default function AuthButton() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirectTarget = useMemo(() => {
    const base = pathname && pathname.startsWith('/') ? pathname : '/today';
    const search = searchParams?.toString();
    return search ? `${base}?${search}` : base;
  }, [pathname, searchParams]);
  const redirectTo = useMemo(() => encodeURIComponent(redirectTarget), [redirectTarget]);

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
    return (
      <Link
        href={`/auth?redirectTo=${redirectTo}`}
        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
      >
        Sign in / Sign up
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-md bg-neutral-900/50 px-3 py-1.5">
      <div className="flex flex-col leading-tight">
        <span className="text-[11px] uppercase tracking-wide text-neutral-500">Signed in</span>
        <span className="text-sm font-medium text-neutral-100 truncate max-w-[10rem] sm:max-w-none">
          {email}
        </span>
      </div>
      <button
        onClick={async () => {
          await supabase.auth.signOut();
          await syncServerAuth('SIGNED_OUT', null, { suppressErrors: false });
          router.replace('/');
          router.refresh();
        }}
        className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700"
      >
        Sign out
      </button>
    </div>
  );
}
