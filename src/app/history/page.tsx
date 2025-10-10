// src/app/history/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Row = {
  id: string;
  content: string;
  created_at: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const fecha = d.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const hora = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  return `${fecha} · ${hora}`;
}

export default async function HistoryPage() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/history");
  }

  const { data, error } = await supabase
    .from("journal")
    .select("id, content, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false }) // más reciente primero
    .limit(200); // ajusta si quieres

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-semibold mb-6">History</h1>

      {error && (
        <p className="text-red-400">
          {error.message}
        </p>
      )}

      {!error && (!data || data.length === 0) && (
        <p className="text-zinc-400">Aún no hay entradas.</p>
      )}

      {data && data.length > 0 && (
        <ul className="space-y-4">
          {data.map((row: Row) => (
            <li key={row.id} className="rounded-xl border border-zinc-800 p-4">
              <div className="text-xs uppercase tracking-wide text-zinc-400 mb-1">
                {formatDate(row.created_at)}
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">
                {row.content}
              </p>
              {/* Si luego quieres edición, puedes dejar el enlace preparado:
              <div className="mt-3">
                <a
                  href={`/today?edit=${row.id}`}
                  className="text-indigo-400 hover:underline text-sm"
                >
                  Editar
                </a>
              </div>
              */}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

//Finn