import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type SearchParams = {
  redirectTo?: string;
};

export default async function DonePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const selfPath = searchParams.redirectTo
    ? `/onboarding/done?redirectTo=${encodeURIComponent(searchParams.redirectTo)}`
    : "/onboarding/done";

  if (!session) {
    redirect(`/signin?redirectTo=${encodeURIComponent(selfPath)}`);
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-3xl font-semibold">¡Bienvenido/a a OneLine!</h1>
      <p className="mt-2 text-muted-foreground">
        Tu cuenta está lista y tu bóveda cifrada se ha creado. Elige tu siguiente paso:
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <a href="/app/today" className="rounded-xl border p-4 hover:bg-accent">
          <h3 className="font-medium">Escribir mi primera línea</h3>
          <p className="text-sm text-muted-foreground">Empieza hoy (menos de 60s)</p>
        </a>
        <a href="/app/history" className="rounded-xl border p-4 hover:bg-accent">
          <h3 className="font-medium">Ver historial</h3>
          <p className="text-sm text-muted-foreground">Revisa entradas anteriores</p>
        </a>
        <a href="/app/settings" className="rounded-xl border p-4 hover:bg-accent">
          <h3 className="font-medium">Abrir ajustes</h3>
          <p className="text-sm text-muted-foreground">Preferencias y seguridad</p>
        </a>
      </div>

      {searchParams.redirectTo && (
        <p className="mt-6 text-sm text-muted-foreground">
          Tenías pendiente ir a {" "}
          <a className="underline" href={searchParams.redirectTo}>
            {searchParams.redirectTo}
          </a>
          . Ábrelo cuando quieras.
        </p>
      )}

      <div className="mt-8 rounded-lg bg-muted p-4 text-sm">
        Consejo: marca “Recordar este dispositivo” para evitar volver a introducir la frase de tu bóveda en este navegador.
      </div>
    </main>
  );
}
