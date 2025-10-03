// src/app/page.tsx  (Server Component)
import { redirect } from "next/navigation";

export default function Home() {
  // Llévame siempre al diario del día
  redirect("/today");
  return null;
}
