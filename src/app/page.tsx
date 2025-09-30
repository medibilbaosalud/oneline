// src/app/page.tsx
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/login'); // o '/today' si prefieres entrar directo a la app
}
