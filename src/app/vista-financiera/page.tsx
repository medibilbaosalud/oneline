import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vista financiera — OneLine",
  description:
    "Panel financiero con métricas clave, gráficas resumidas y tablas de pagos organizadas por profesionales.",
};

type SummaryCard = {
  title: string;
  value: string;
  caption: string;
  trend: string;
};

type ChartHighlight = {
  title: string;
  description: string;
  trend: string;
  accent: string;
};

type PaymentStatus = "pagado" | "pendiente" | "revisar";

type PaymentRecord = {
  concepto: string;
  programado: string;
  importe: string;
  estado: PaymentStatus;
};

type ProfessionalGroup = {
  nombre: string;
  etiqueta: string;
  descripcion: string;
  pagos: PaymentRecord[];
};

const resumen: SummaryCard[] = [
  {
    title: "Saldo acumulado",
    value: "€32,480",
    caption: "Disponible al cierre del día",
    trend: "+4.2% vs. mes anterior",
  },
  {
    title: "Ingresos del mes",
    value: "€18,940",
    caption: "Facturación confirmada",
    trend: "+12.8% vs. objetivo",
  },
  {
    title: "Gasto operativo",
    value: "€12,750",
    caption: "Pagos realizados",
    trend: "−6.1% vs. promedio trimestral",
  },
];

const graficasPrincipales: ChartHighlight[] = [
  {
    title: "Ingresos vs. gastos",
    description: "Saldos netos de los últimos 6 meses",
    trend: "Tendencia alcista estable",
    accent: "from-emerald-400/70 via-emerald-500/20 to-transparent",
  },
  {
    title: "Comportamiento de pagos",
    description: "Distribución entre puntuales, pendientes y revisiones",
    trend: "97% completados a tiempo",
    accent: "from-indigo-400/70 via-indigo-500/20 to-transparent",
  },
  {
    title: "Liquidez proyectada",
    description: "Proyección de caja a 90 días con gastos fijos y variables",
    trend: "Cobertura de 2.7 meses",
    accent: "from-fuchsia-400/70 via-fuchsia-500/20 to-transparent",
  },
];

const profesionales: ProfessionalGroup[] = [
  {
    nombre: "Hugo",
    etiqueta: "Psicología",
    descripcion: "Sesiones individuales y seguimiento clínico",
    pagos: [
      { concepto: "Sesiones 14-18 mayo", programado: "20/05/2024", importe: "€420", estado: "pagado" },
      { concepto: "Supervisión mensual", programado: "28/05/2024", importe: "€150", estado: "pendiente" },
      { concepto: "Material terapéutico", programado: "05/06/2024", importe: "€60", estado: "revisar" },
    ],
  },
  {
    nombre: "June",
    etiqueta: "Psicopedagogía",
    descripcion: "Refuerzos académicos y plan de estudio",
    pagos: [
      { concepto: "Bonos trimestrales", programado: "30/05/2024", importe: "€580", estado: "pagado" },
      { concepto: "Sesión grupal", programado: "02/06/2024", importe: "€120", estado: "pendiente" },
      { concepto: "Reembolso transporte", programado: "04/06/2024", importe: "€32", estado: "pagado" },
    ],
  },
  {
    nombre: "Mari Carmen",
    etiqueta: "Psicología infantil",
    descripcion: "Evaluación emocional y seguimiento",
    pagos: [
      { concepto: "Sesiones 6-10 mayo", programado: "18/05/2024", importe: "€360", estado: "pagado" },
      { concepto: "Reunión familias", programado: "24/05/2024", importe: "€95", estado: "pendiente" },
      { concepto: "Material lúdico", programado: "03/06/2024", importe: "€48", estado: "revisar" },
    ],
  },
  {
    nombre: "Recepción",
    etiqueta: "Administración",
    descripcion: "Turnos de recepción y coordinación de agendas",
    pagos: [
      { concepto: "Nómina mayo", programado: "31/05/2024", importe: "€1,100", estado: "pagado" },
      { concepto: "Horas extra semana 19", programado: "25/05/2024", importe: "€85", estado: "pagado" },
      { concepto: "Formación atención", programado: "12/06/2024", importe: "€140", estado: "pendiente" },
    ],
  },
  {
    nombre: "Nutris",
    etiqueta: "Nutrición",
    descripcion: "Consultas dietéticas y planes personalizados",
    pagos: [
      { concepto: "Consultas iniciales", programado: "21/05/2024", importe: "€275", estado: "pagado" },
      { concepto: "Seguimiento mensual", programado: "04/06/2024", importe: "€210", estado: "pendiente" },
      { concepto: "Compra bioimpedancia", programado: "18/06/2024", importe: "€320", estado: "revisar" },
    ],
  },
  {
    nombre: "Logopedas",
    etiqueta: "Logopedia",
    descripcion: "Sesiones de articulación y lenguaje",
    pagos: [
      { concepto: "Sesiones 7-15 mayo", programado: "22/05/2024", importe: "€410", estado: "pagado" },
      { concepto: "Evaluaciones finales", programado: "29/05/2024", importe: "€180", estado: "pendiente" },
      { concepto: "Material fonación", programado: "07/06/2024", importe: "€96", estado: "pagado" },
    ],
  },
  {
    nombre: "Nkane",
    etiqueta: "Terapias externas",
    descripcion: "Sesiones especializadas itinerantes",
    pagos: [
      { concepto: "Programación mayo", programado: "27/05/2024", importe: "€640", estado: "pendiente" },
      { concepto: "Traslado a domicilio", programado: "30/05/2024", importe: "€80", estado: "pagado" },
      { concepto: "Ajustes de contrato", programado: "10/06/2024", importe: "€240", estado: "revisar" },
    ],
  },
];

const estados: Record<PaymentStatus, { label: string; className: string }> = {
  pagado: {
    label: "Pagado",
    className: "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/20",
  },
  pendiente: {
    label: "Pendiente",
    className: "bg-amber-500/10 text-amber-300 ring-1 ring-amber-400/20",
  },
  revisar: {
    label: "Revisar",
    className: "bg-rose-500/10 text-rose-300 ring-1 ring-rose-400/20",
  },
};

function ResumenCard({ title, value, caption, trend }: SummaryCard) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-[0_10px_40px_rgba(15,23,42,0.35)]">
      <h3 className="text-sm font-medium text-slate-300">{title}</h3>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">{caption}</p>
      <p className="mt-4 text-sm font-medium text-emerald-300">{trend}</p>
    </div>
  );
}

function GraficaDestacada({ title, description, trend, accent }: ChartHighlight) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 p-6">
      <div
        aria-hidden
        className={`pointer-events-none absolute -left-10 -top-24 h-56 w-56 rounded-full bg-gradient-to-br ${accent} blur-3xl`}
      />
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm text-slate-300">{description}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-wide text-slate-200">
          Actualizado
        </span>
      </header>
      <div className="mt-6 h-40 overflow-hidden rounded-2xl border border-white/5 bg-slate-950/60 p-4">
        <div className="flex h-full items-end gap-2 text-xs text-slate-500">
          {[40, 65, 52, 78, 60, 90].map((h, idx) => (
            <div key={idx} className="flex flex-1 flex-col items-center">
              <div className="w-8 rounded-t-md bg-gradient-to-t from-white/5 via-white/20 to-white/70" style={{ height: `${h}%` }} />
              <span className="mt-2 text-[11px]">M{idx + 1}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-200">{trend}</p>
    </div>
  );
}

function EstadoPill({ estado }: { estado: PaymentStatus }) {
  const conf = estados[estado];
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${conf.className}`}>{conf.label}</span>;
}

function TablaProfesionales({ nombre, etiqueta, descripcion, pagos }: ProfessionalGroup) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 shadow-[0_12px_45px_rgba(15,23,42,0.45)]">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-xl font-semibold text-white">{nombre}</h3>
          <p className="text-sm text-slate-300">{etiqueta}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-wide text-slate-300">
          Pagos de profesionales
        </span>
      </header>
      <p className="mt-3 text-sm text-slate-400">{descripcion}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10 text-left text-sm text-slate-200">
          <thead className="text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th scope="col" className="px-3 py-2">Concepto</th>
              <th scope="col" className="px-3 py-2">Programado</th>
              <th scope="col" className="px-3 py-2">Importe</th>
              <th scope="col" className="px-3 py-2">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {pagos.map((pago, idx) => (
              <tr key={idx} className="hover:bg-white/3">
                <td className="px-3 py-3 text-sm text-white">{pago.concepto}</td>
                <td className="px-3 py-3 text-sm text-slate-300">{pago.programado}</td>
                <td className="px-3 py-3 font-medium text-white">{pago.importe}</td>
                <td className="px-3 py-3">
                  <EstadoPill estado={pago.estado} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function VistaFinancieraPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-6xl px-5 py-12 space-y-12">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Panel principal</p>
          <h1 className="text-3xl font-semibold text-white md:text-4xl">Vista financiera</h1>
          <p className="max-w-3xl text-sm text-slate-300">
            Consolidado de métricas, gráficos y tablas de control para seguimiento de ingresos, gastos y pagos a profesionales.
            Las visualizaciones principales se muestran primero y las tablas quedan agrupadas al pie para una revisión detallada.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {resumen.map((card) => (
            <ResumenCard key={card.title} {...card} />
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {graficasPrincipales.map((grafica) => (
            <GraficaDestacada key={grafica.title} {...grafica} />
          ))}
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-white">Pagos de profesionales</h2>
              <p className="text-sm text-slate-300">
                Antes denominado &ldquo;Variables de profesionales&rdquo;. Reúne los pagos a Hugo, June, Mari Carmen y recepción junto
                con las tablas de Nutris, Logopedas y Nkane.
              </p>
            </div>
            <span className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-wide text-slate-300 md:inline-flex">
              Tablas consolidadas
            </span>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {profesionales.map((grupo) => (
              <TablaProfesionales key={grupo.nombre} {...grupo} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
