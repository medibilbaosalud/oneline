import { redirect } from "next/navigation";

import { supabaseServer } from "@/lib/supabaseServer";

import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SettingsPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth?redirectTo=${encodeURIComponent('/settings')}`);
  }

  return <SettingsClient />;
}
