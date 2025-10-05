// src/app/login/page.tsx
import LoginClient from './LoginClient';

// Evita el prerender de esta ruta
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Page({
  searchParams,
}: {
  searchParams?: { next?: string };
}) {
  const next = searchParams?.next ?? '/today'; // leemos el query en el server
  return <LoginClient next={next} />; // se lo pasamos al client component
}
