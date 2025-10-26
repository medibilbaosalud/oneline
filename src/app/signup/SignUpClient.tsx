"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const POLL_ATTEMPTS = 30; // 2 seconds * 30 = 60 seconds

type SignUpClientProps = {
  redirectTo?: string;
};

export default function SignUpClient({ redirectTo }: SignUpClientProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onboardingPath = useMemo(() => {
    if (redirectTo) {
      return `/onboarding/vault?redirectTo=${encodeURIComponent(redirectTo)}`;
    }
    return "/onboarding/vault";
  }, [redirectTo]);

  useEffect(() => {
    if (!sent) return;
    let attempts = 0;
    let active = true;

    const id = setInterval(async () => {
      attempts += 1;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!active) return;
      if (session) {
        clearInterval(id);
        router.replace(onboardingPath);
      } else if (attempts >= POLL_ATTEMPTS) {
        clearInterval(id);
      }
    }, 2000);

    return () => {
      active = false;
      clearInterval(id);
    };
  }, [sent, router, onboardingPath]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErr(null);
    setSent(false);
    setLoading(true);
    try {
      const origin = window.location.origin;
      const { error } = await supabase.auth.signUp(
        {
          email,
          options: {
            emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(onboardingPath)}`,
          },
        } as Parameters<typeof supabase.auth.signUp>[0]
      );
      if (error) throw error;
      setSent(true);
    } catch (error) {
      const message =
        error instanceof Error && error.message ? error.message : "No pudimos enviar el enlace.";
      setErr(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-2">Crea tu cuenta</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Te enviaremos un enlace para verificar tu email y crear tu cuenta. Este enlace <strong>no</strong> se usa para iniciar sesión.
      </p>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          required
          placeholder="tu@email.com"
          className="w-full rounded-lg border bg-background p-3"
        />
        <button
          type="submit"
          disabled={!email || loading}
          className="w-full rounded-lg bg-primary p-3 text-primary-foreground disabled:opacity-60"
        >
          {loading ? "Enviando enlace…" : "Enviar enlace de verificación"}
        </button>
      </form>
      {err && <p className="mt-3 text-sm text-red-500">{err}</p>}
      {sent && (
        <div className="mt-4 rounded-lg border p-3 text-sm">
          Te enviamos un enlace de confirmación. Abre tu correo. Esta pestaña se actualizará automáticamente cuando confirmes.
        </div>
      )}
      <hr className="my-6" />
      <div className="space-y-2">
        <OAuthButtons onboardingPath={onboardingPath} />
        <p className="text-xs text-muted-foreground">¿Prefieres Google? Úsalo aquí debajo.</p>
      </div>
    </main>
  );
}

function OAuthButtons({ onboardingPath }: { onboardingPath: string }) {
  const onGoogle = async () => {
    const origin = window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(onboardingPath)}`,
      },
    });
  };

  return (
    <button onClick={onGoogle} className="w-full rounded-lg border p-3">
      Continuar con Google
    </button>
  );
}
