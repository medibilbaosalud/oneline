// src/app/login/page.tsx
import { Suspense } from "react";
import LoginClient from "./LoginClient";

// Evita SSG para que el estado de auth siempre sea actual
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <main className="min-h-[calc(100vh-48px)] bg-neutral-950 text-neutral-50">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="mb-8 text-center text-2xl font-semibold">Sign in to OneLine</h1>
        <Suspense fallback={null}>
          <LoginClient />
        </Suspense>
      </div>
    </main>
  );
}
