import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabaseServer";
import VaultStepClient from "./VaultStepClient";

export const dynamic = "force-dynamic";

const TABLE = "user_vaults";

type SearchParams = {
  redirectTo?: string;
};

export default async function VaultOnboardingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const onboardingPath = searchParams.redirectTo
    ? `/onboarding/vault?redirectTo=${encodeURIComponent(searchParams.redirectTo)}`
    : "/onboarding/vault";

  if (!session) {
    redirect(`/signin?redirectTo=${encodeURIComponent(onboardingPath)}`);
  }

  const { data: existing } = await supabase
    .from(TABLE)
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (existing) {
    const donePath = searchParams.redirectTo
      ? `/onboarding/done?redirectTo=${encodeURIComponent(searchParams.redirectTo)}`
      : "/onboarding/done";
    redirect(donePath);
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-3xl font-semibold">Crea tu bóveda cifrada</h1>
      <p className="mt-2 text-muted-foreground">
        Escoge una frase que solo tú recuerdes. La necesitarás cada vez que quieras escribir o leer tus entradas.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Guardaremos una copia cifrada de la clave en tu cuenta para que puedas recuperarla, pero la frase nunca sale de tu
        navegador.
      </p>
      <VaultStepClient redirectTo={searchParams.redirectTo} />
      <p className="mt-6 text-xs text-muted-foreground">
        Consejo: anótala en un gestor de contraseñas. Si la olvidas o la cambias, nadie podrá descifrar tu diario.
      </p>
    </main>
  );
}
