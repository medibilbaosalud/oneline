"use client";

import { useMemo, useState } from "react";

type AssistantStep = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  helper?: string;
};

const STEPS: AssistantStep[] = [
  {
    title: "Paso 1 · Crea tu acceso",
    description:
      "Haz clic en “Start now — go to Today” o en “Try visitor mode” y selecciona la opción de crear cuenta. Introduce tu correo electrónico para que podamos enviarte el enlace mágico.",
    actionLabel: "Ir a la página de acceso",
    actionHref: "/signin",
    helper:
      "Solo necesitas un correo válido. No hay contraseñas tradicionales ni formularios interminables.",
  },
  {
    title: "Paso 2 · Confirma desde tu correo",
    description:
      "Abre el mensaje que te enviaremos y pulsa el botón del enlace mágico. Te llevará de vuelta a OneLine con tu sesión verificada.",
    helper:
      "Si no ves el correo, revisa la carpeta de spam o espera unos segundos. El remitente será support@oneline.day.",
  },
  {
    title: "Paso 3 · Protege tu diario",
    description:
      "Al entrar por primera vez te pediremos crear una frase-segura. Guárdala bien: es la llave que cifra y descifra tus líneas, y nadie más puede recuperarla.",
    helper:
      "Consejo: usa una frase única, con varias palabras y números. Guarda una copia en tu gestor de contraseñas para no perder el acceso.",
  },
  {
    title: "Listo · Empieza a escribir",
    description:
      "Ve a Today y escribe tu primera línea. Con solo 333 caracteres al día empezarás a construir tu historia personal.",
    actionLabel: "Ir a Today",
    actionHref: "/today",
  },
];

export function OnboardingAssistant() {
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];
  const totalSteps = STEPS.length;

  const progress = useMemo(() => ((stepIndex + 1) / totalSteps) * 100, [stepIndex, totalSteps]);

  const goTo = (index: number) => {
    if (index < 0 || index >= totalSteps) return;
    setStepIndex(index);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 text-left text-sm text-zinc-200 backdrop-blur">
      <div className="absolute -inset-20 -z-10 rounded-full bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_60%)] blur-3xl" />
      <div className="relative flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-[0.28em] text-emerald-200/80">Asistente de inicio</span>
          <h2 className="text-lg font-semibold text-white">Crea tu cuenta en tres pasos</h2>
        </header>

        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-indigo-400 to-fuchsia-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="tabular-nums text-white/70">{stepIndex + 1}&nbsp;/&nbsp;{totalSteps}</span>
        </div>

        <article className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4">
          <h3 className="text-base font-semibold text-white">{step.title}</h3>
          <p className="text-sm leading-relaxed text-zinc-300">{step.description}</p>
          {step.helper ? <p className="text-xs leading-relaxed text-zinc-400">{step.helper}</p> : null}
          {step.actionLabel && step.actionHref ? (
            <a
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-zinc-100 transition hover:bg-white/20"
              href={step.actionHref}
            >
              {step.actionLabel}
              <span aria-hidden>→</span>
            </a>
          ) : null}
        </article>

        <footer className="flex items-center justify-between text-xs text-zinc-400">
          <button
            type="button"
            onClick={() => goTo(stepIndex - 1)}
            disabled={stepIndex === 0}
            className="rounded-xl border border-white/10 px-4 py-2 font-medium text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Anterior
          </button>
          <div className="flex items-center gap-1">
            {STEPS.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => goTo(index)}
                className={`h-2 w-2 rounded-full transition ${
                  index === stepIndex ? "bg-emerald-400" : "bg-white/15 hover:bg-white/30"
                }`}
                aria-label={`Ir al paso ${index + 1}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => goTo(stepIndex + 1)}
            disabled={stepIndex === totalSteps - 1}
            className="rounded-xl border border-white/10 px-4 py-2 font-medium text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Siguiente
          </button>
        </footer>
      </div>
    </div>
  );
}

