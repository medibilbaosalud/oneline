import { unstable_noStore as noStore } from "next/cache";
import SessionGate from "@/components/auth/SessionGate";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SettingsPage() {
  noStore();
  return (
    <SessionGate redirectBackTo="/settings">
      <SettingsClient />
    </SessionGate>
  );
}
