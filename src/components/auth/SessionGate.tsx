import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function SessionGate({
  children,
  redirectBackTo,
}: {
  children: React.ReactNode;
  redirectBackTo: string;
}) {
  const supabase = createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    const target = redirectBackTo.startsWith('/') ? redirectBackTo : `/${redirectBackTo}`;
    redirect(`/login?redirectTo=${encodeURIComponent(target)}`);
  }

  return <>{children}</>;
}
