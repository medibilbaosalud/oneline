"use client";
import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const supabase = createClientComponentClient();

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // si tienes “Confirm email” desactivado en Supabase, te logueas al momento:
        await supabase.auth.signInWithPassword({ email, password });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      window.location.href = "/today";
    } catch (e: any) {
      setErr(e?.message ?? "Error de autenticación");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm p-6 bg-neutral-900/70 rounded-2xl space-y-3 shadow">
        <h1 className="text-xl font-semibold">
          {isSignup ? "Crear cuenta" : "Iniciar sesión"}
        </h1>

        <input
          className="w-full p-3 rounded bg-neutral-800 text-neutral-100 placeholder:text-neutral-500 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-400"
          placeholder="Email" type="email" value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full p-3 rounded bg-neutral-800 text-neutral-100 placeholder:text-neutral-500 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-400"
          placeholder="Contraseña" type="password" value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {err && <p className="text-sm text-red-400">{err}</p>}

        <button
          disabled={busy}
          onClick={submit}
          className="w-full py-2 rounded bg-white/20 hover:bg.white/30 disabled:opacity-60 transition"
        >
          {busy ? "..." : isSignup ? "Crear y entrar" : "Entrar"}
        </button>

        <button
          type="button"
          className="text-sm opacity-80 hover:opacity-100"
          onClick={() => setIsSignup((v) => !v)}
        >
          {isSignup ? "¿Ya tienes cuenta? Inicia sesión" : "¿Sin cuenta? Crea una"}
        </button>
      </div>
    </main>
  );
}
