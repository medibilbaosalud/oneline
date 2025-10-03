'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function AuthButton() {
  const supabase = createClientComponentClient();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setEmail(session?.user?.email ?? null);
    })();
  }, [supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    // Opcional: refrescar UI
    window.location.assign('/'); // o '/today'
  }

  function goToSignIn() {
    window.location.assign('/auth'); // nuestra página de login (ver punto 2)
  }

  return email ? (
    <div className="flex items-center gap-3">
      <span className="text-sm text-neutral-400">{email}</span>
      <button
        onClick={handleSignOut}
        className="rounded-lg bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700"
      >
        Sign out
      </button>
    </div>
  ) : (
    <button
      onClick={goToSignIn}
      className="rounded-lg bg-indigo-500 px-3 py-2 text-sm text-white hover:bg-indigo-400"
    >
      Sign in
    </button>
  );
}
