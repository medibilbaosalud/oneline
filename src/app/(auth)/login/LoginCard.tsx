"use client";

import { useState } from "react";

export default function LoginCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
      <h1 className="mb-1 text-2xl font-semibold">Bienvenido a OneLine</h1>
      <p className="mb-6 text-sm text-neutral-400">
        Escribe una línea cada día ✍️
      </p>

      <form className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm text-neutral-300">Email</label>
          <input
            className="w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 outline-none placeholder:text-neutral-500 focus:border-indigo-400/50"
            placeholder="tu@email.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-neutral-300">Contraseña</label>
          <input
            className="w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 outline-none placeholder:text-neutral-500 focus:border-indigo-400/50"
            placeholder="••••••••"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        <button
          type="button"
          className="mt-2 w-full rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white hover:bg-indigo-400"
        >
          Iniciar sesión
        </button>

        <button
          type="button"
          className="w-full rounded-lg border border-white/10 px-4 py-2 text-neutral-200 hover:bg-white/5"
        >
          Crear cuenta
        </button>
      </form>
    </div>
  );
}
