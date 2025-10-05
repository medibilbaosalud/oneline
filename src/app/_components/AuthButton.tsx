'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function AuthButton() {
  const supabase = useMemo(() => createClientComponentClient(), []);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  if (loading) return null;

  return userEmail ? (
    <div className="flex items-center gap-2">
      <span className="text-sm text-neutral-300 hidden sm:block">{userEmail}</span>
      <button
        onClick={async () => {
          await supabase.auth.signOut();
          location.href = '/';
        }}
        className="rounded-md bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700"
      >
        Sign out
      </button>
    </div>
  ) : (
    <Link
      href="/login"
      className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
    >
      Sign in
    </Link>
  );
}
