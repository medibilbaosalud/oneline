// src/app/page.tsx
import Link from "next/link";

export const metadata = {
  title: "OneLine — Una línea al día",
  description:
    "Escribe una sola línea cada día. Simple, privado y con resúmenes inteligentes.",
};

export default function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0B0B10] text-zinc-100">
      {/* Glow decorativo */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(88,76,255,0.25),rgba(5,5,10,0)_60%)] blur-2xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[400px] w-[600px] rounded-full bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,200,160,0.18),rgba(5,5,10,0)_60%)] blur-2xl" />

      {/* Header */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 rounded-md bg-gradient-to-tr from-indigo-500 via-violet-500 to-emerald-400" />
          <span className="text-sm font-semibold tracking-wide text-zinc-300">
            OneLine
          </span>
        </div>

        <nav className="hidden gap-6 text-sm text-zinc-400 md:flex">
          <a href="#por-que" className="hover:text-zinc-200 transition">
            ¿Por qué?
          </a>
          <a href="#como-funciona" className="hover:text-zinc-200 transition">
            Cómo funciona
          </a>
          <a href="#seguridad" className="hover:text-zinc-200 transition">
            Privacidad
          </a>
        </nav>

        <Link
          href="/today"
          className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-400 transition"
        >
          Ir a Today
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-8 pt-8 md:pt-16">
        <div className="flex flex-col items-center text-center">
          <h1 className="bg-gradient-to-br from-zinc-50 via-zinc-200 to-zinc-400 bg-clip-text text-4xl font-semibold leading-tight text-transparent md:text-6xl">
            Una línea al día.
            <br className="hidden md:block" />
            <span className="block text-zinc-300">Un hábito para siempre.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-balance text-base leading-relaxed text-zinc-400 md:text-lg">
            OneLine te pide solo una frase al día. Es rápido, privado y te
            devuelve resúmenes inteligentes cuando quieres mirar atrás. Sin
            ruido. Sin presión. Solo claridad.
          </p>

          <div className="mt-8 flex gap-3">
            <Link
              href="/today"
              className="rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-400 transition"
            >
              Empezar ahora — Ir a Today
            </Link>
            <a
              href="#por-que"
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-6 py-3 text-sm font-semibold text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/60 transition"
            >
              Ver cómo funciona
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="por-que"
        className="mx-auto w-full max-w-6xl px-6 py-10 md:py-16"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard
            title="Una línea. Punto."
            desc="Escribe lo primero que te venga. En segundos. Sin pantallas complejas, sin rituales. Solo el gesto mínimo para guardar lo que importa."
            icon="📝"
          />
          <FeatureCard
            title="Privado por diseño"
            desc="Tus entradas son tuyas. Guardadas de forma segura y pensadas para tu tranquilidad. Exporta cuando quieras."
            icon="🔒"
          />
          <FeatureCard
            title="Resúmenes inteligentes"
            desc="En cualquier momento puedes generar historias del último mes, 3, 6 o 12 meses. Una visión nítida de tu año, sin esfuerzo."
            icon="✨"
          />
        </div>
      </section>

      {/* How it works */}
      <section
        id="como-funciona"
        className="mx-auto w-full max-w-6xl px-6 py-10 md:py-16"
      >
        <h2 className="mb-6 text-xl font-semibold text-zinc-200">
          ¿Cómo funciona?
        </h2>
        <ol className="space-y-4 text-zinc-300">
          <li className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            1) Abre <span className="font-medium text-zinc-100">Today</span> y
            escribe una sola línea.
          </li>
          <li className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            2) Repite mañana. Y pasado mañana. Un hábito diminuto que crece.
          </li>
          <li className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            3) Cuando quieras, pide un resumen del último mes, 3, 6 o 12 meses.
          </li>
        </ol>
        <Link
          href="/today"
          className="mt-6 inline-block rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition"
        >
          Probar ahora
        </Link>
      </section>

      {/* Privacy */}
      <section
        id="seguridad"
        className="mx-auto w-full max-w-6xl px-6 pb-20 md:pb-28"
      >
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-6">
          <h3 className="text-lg font-semibold text-zinc-200">
            Privacidad por defecto
          </h3>
          <p className="mt-2 text-zinc-400">
            OneLine está diseñado para que escribas sin miedo a perder el
            control de tus datos. Tú decides qué generar y cuándo, y puedes
            borrar o exportar cuando quieras.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900/80 bg-[#0A0A0F]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-zinc-500 md:flex-row">
          <span>© {new Date().getFullYear()} OneLine</span>
          <Link
            href="/today"
            className="rounded-lg bg-indigo-600/90 px-4 py-2 font-medium text-white hover:bg-indigo-500 transition"
          >
            Ir a Today
          </Link>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  title,
  desc,
  icon,
}: {
  title: string;
  desc: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-5 backdrop-blur-sm">
      <div className="mb-2 text-2xl">{icon}</div>
      <h3 className="text-base font-semibold text-zinc-200">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{desc}</p>
    </div>
  );
}