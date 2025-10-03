"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function AuthButton() {
  const supabase = createClientComponentClient();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, [supabase]);

  const signInGoogle = async () => {
    const origin = window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/auth/callback` },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.assign("/today");
  };

  return user ? (
    <button
      onClick={signOut}
      className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-700"
    >
      Sign out
    </button>
  ) : (
    <button
      onClick={signInGoogle}
      className="rounded-md bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-400"
    >
      Sign in
    </button>
  );
}
