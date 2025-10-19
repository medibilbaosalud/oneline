"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

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

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
      router.refresh();
    });

    return () => {
      mounted = false;
      subscription?.subscription.unsubscribe();
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
    const next = encodeURIComponent(pathname || "/today");
    return (
      <Link
        href={`/auth?next=${next}`}
        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
      >
        Sign in / Sign up
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-md bg-neutral-900/50 px-3 py-1.5">
      <div className="flex max-w-[10rem] flex-col leading-tight sm:max-w-none">
        <span className="text-[11px] uppercase tracking-wide text-neutral-500">Signed in</span>
        <span className="truncate text-sm font-medium text-neutral-100">{email}</span>
      </div>
      <button
        onClick={async () => {
          await supabase.auth.signOut();
          router.replace("/today");
          router.refresh();
        }}
        className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700"
      >
        Sign out
      </button>
    </div>
  );
}
