// src/app/today/page.tsx
import { requireConsentOrRedirect } from "@/lib/requireConsent";
import TodayClient from "./TodayClient";

export const metadata = {
  title: "Today — OneLine",
};

export default async function TodayPage() {
  // Gate de autenticación/consentimiento
  await requireConsentOrRedirect(true);

  // UI cliente (texto, guardar, etc.)
  return <TodayClient />;
}