// src/app/_debug-auth/page.tsx
import { supabaseServer } from '@/lib/supabaseServer';
import ClientSessionState from './ClientSessionState';

export const dynamic = 'force-dynamic';

export default async function DebugAuthPage() {
  const supabase = await supabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <div className="min-h-screen bg-neutral-950 px-6 py-12 text-neutral-50">
      <div className="mx-auto w-full max-w-3xl space-y-6 rounded-2xl border border-white/10 bg-neutral-900/60 p-6">
        <h1 className="text-2xl font-semibold">Auth Debug</h1>
        <p className="text-sm text-neutral-400">
          Use this page to confirm whether Supabase sessions are available on the server and client during SSR.
        </p>
        <pre className="overflow-auto rounded-xl bg-black/40 p-4 text-sm text-emerald-300">
          SERVER hasSession: {String(!!session)}
        </pre>
        <ClientSessionState />
      </div>
    </div>
  );
}
