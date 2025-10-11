// src/app/today/page.tsx
import { requireConsentOrRedirect } from "@/lib/requireConsent";
import TodayClient from "./TodayClient";

export default async function TodayPage() {
  await requireConsentOrRedirect();
  return <TodayClient />;
}