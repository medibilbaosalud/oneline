import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function requireConsentOrRedirect() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  const consent = (user.user_metadata as any)?.has_consented;
  if (!consent) redirect('/auth'); // si quisieras mostrar una pantalla de consentimiento, cámbialo aquí
}