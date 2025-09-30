// src/app/login/LoginCard.tsx  (o src/app/(auth)/login/LoginCard.tsx)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type Mode = "sign-in" | "sign-up";

export default function LoginCard() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // ✅ dentro pasa a tu app (cámbialo si quieres ir a otra ruta)
        router.push("/today");
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("Cuenta creada. Revisa tu email si se requiere verificación.");
      }
    } catch (err: any) {
      setMsg(err.message ?? "Algo salió mal.");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    setLoading(true);
    setMsg(null);
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        // Si tienes configurada la ruta de callback:
        // options: { redirectTo: `${location.origin}/auth/callback` },
      });
    } catch (err: any) {
      setMsg(err.message ?? "No se pudo iniciar con Google");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900/60 p-6 shadow-2xl backdrop-blur">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Bienvenido a OneLine</h1>
        <p className="mt-1 text-sm text-neutral-400">
          {mode === "sign-in"
            ? "Inicia sesión para continuar"
            : "Crea tu cuenta para empezar"}
        </p>
      </div>

      {/* Tabs Sign in / Sign up */}
      <div className="mb-6 grid grid-cols-2 rounded-lg bg-neutral-800 p-1">
        <button
          className={`rounded-md px-3 py-2 text-sm transition ${
            mode === "sign-in" ? "bg-neutral-700 text-white" : "text-neutral-400"
          }`}
          onClick={() => setMode("sign-in")}
          type="button"
        >
          Iniciar sesión
        </button>
        <button
          className={`rounded-md px-3 py-2 text-sm transition ${
            mode === "sign-up" ? "bg-neutral-700 text-white" : "text-neutral-400"
          }`}
          onClick={() => setMode("sign-up")}
          type="button"
        >
          Crear cuenta
        </button>
      </div>

      {/* Form */}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-neutral-300">Email</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full rounded-lg border border-white/10 bg-neutral-800 px-3 py-2 text-sm outline-none ring-0 placeholder:text-neutral-500 focus:border-indigo-500"
            placeholder="tucorreo@ejemplo.com"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-neutral-300">Contraseña</label>
          <input
            required
            type="password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-full rounded-lg border border-white/10 bg-neutral-800 px-3 py-2 text-sm outline-none ring-0 placeholder:text-neutral-500 focus:border-indigo-500"
            placeholder="••••••••"
          />
        </div>

        {msg && (
          <p className="rounded-md bg-neutral-800 px-3 py-2 text-center text-sm text-neutral-300">
            {msg}
          </p>
        )}

        <button
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-60"
        >
          {loading ? "Procesando..." : mode === "sign-in" ? "Entrar" : "Crear cuenta"}
        </button>
      </form>

      {/* Divider */}
      <div className="my-6 flex items-center gap-3 text-xs text-neutral-500">
        <div className="h-px flex-1 bg-white/10" />
        <span>o continúa con</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {/* OAuth */}
      <button
        onClick={signInWithGoogle}
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-neutral-800 px-4 py-2 text-sm text-neutral-200 transition hover:bg-neutral-750 disabled:opacity-60"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 533.5 544.3"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path fill="#4285F4" d="M533.5 278.4c0-17.4-1.6-34.1-4.6-50.4H272.1v95.3h147.2c-6.4 34.5-25.7 63.8-54.7 83.3v69.2h88.6c51.8-47.7 80.3-118.1 80.3-197.4z"/>
          <path fill="#34A853" d="M272.1 544.3c73.7 0 135.5-24.4 180.7-66.5l-88.6-69.2c-24.6 16.4-56.2 26-92.1 26-70.8 0-130.8-47.8-152.3-112.1h-92.9v70.5c45.5 90.1 139.5 150.8 245.2 150.8z"/>
          <path fill="#FBBC05" d="M119.8 322.5c-10.8-32.4-10.8-67.7 0-100.1v-70.5H26.9C-18 211.8-18 332.9 26.9 422.9l92.9-70.4z"/>
          <path fill="#EA4335" d="M272.1 107.7c38.9-.6 76.6 13.7 105.3 39.9l79-79C404.6 24.3 342.6 0 272.1 0 166.4 0 72.4 60.7 26.9 150.8l92.9 70.5c21.5-64.3 81.6-113.6 152.3-113.6z"/>
        </svg>
        Google
      </button>

      <p className="mt-6 text-center text-xs text-neutral-500">
        Al continuar aceptas nuestros <span className="underline">Términos</span> y <span className="underline">Privacidad</span>.
      </p>
    </div>
  );
}
