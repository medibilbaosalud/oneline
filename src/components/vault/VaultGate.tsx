import type { ReactNode } from 'react';
import { createServerSupabase } from '@/lib/supabase/server';
import type { WrappedBundle } from '@/lib/crypto';
import VaultKeyClientGate from './VaultKeyClientGate';

export default async function VaultGate({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  let bundle: WrappedBundle | null = null;
  let serverError: string | null = null;

  if (user) {
    const { data, error } = await supabase
      .from('user_vaults')
      .select('wrapped_b64, iv_b64, salt_b64, version')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[vault] failed to fetch bundle on server', error);
      serverError = 'We could not check your encrypted vault. Try reloading the page.';
    } else {
      bundle = data ?? null;
    }
  }

  return (
    <VaultKeyClientGate userId={user?.id ?? null} initialBundle={bundle} serverError={serverError}>
      {children}
    </VaultKeyClientGate>
  );
}
