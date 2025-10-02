// src/app/summaries/page.tsx  (Server Component – wrapper)
import dynamic from 'next/dynamic';

// Fuerza que NUNCA se pre-renderice/SSG:
export const dynamic = 'force-dynamic';
export const revalidate = 0;                 // sin caché estática
export const fetchCache = 'force-no-store';  // evita cacheo de fetch en build/SSR
export const runtime = 'nodejs';             // (opcional) por si acaso estabas en Edge

// Importa el componente cliente (con 'use client'):
const SummariesClientPage = dynamic(() => import('./ClientPage'), { ssr: false });

export default function Page() {
  // Renderiza sólo el cliente; el wrapper server no hace ningún fetch
  return <SummariesClientPage />;
}
