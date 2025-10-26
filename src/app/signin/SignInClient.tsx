"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type SignInClientProps = {
  next: string;
};

export default function SignInClient({ next }: SignInClientProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace(next);
    });
  }, [router, next]);

  const onGoogle = async () => {
    const origin = window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  };

  const onPasswordSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.replace(next);
    } catch (error) {
      const message =
        error instanceof Error && error.message ? error.message : "No pudimos iniciar sesión.";
      setErr(message);
    } finally {
      setLoading(false);
    }
  };

  const signupHref = next ? `/signup?redirectTo=${encodeURIComponent(next)}` : "/signup";

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-2">Inicia sesión</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Usa tu cuenta existente. Si aún no tienes, crea una aquí.
      </p>
      <button onClick={onGoogle} className="w-full rounded-lg border p-3 mb-4">
        Continuar con Google
      </button>
      <form onSubmit={onPasswordSignIn} className="space-y-3">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border bg-background p-3"
            placeholder="tu@email.com"
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border bg-background p-3"
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>
        {err && <p className="text-sm text-red-500">{err}</p>}
        <button
          type="submit"
          disabled={!email || !password || loading}
          className="w-full rounded-lg bg-primary p-3 text-primary-foreground disabled:opacity-60"
        >
          {loading ? "Conectando…" : "Entrar con email y contraseña"}
        </button>
      </form>
      <p className="mt-6 text-sm">
        ¿Nuevo en OneLine? {" "}
        <a className="underline" href={signupHref}>
          Crea tu cuenta
        </a>
      </p>
    </main>
  );
}
