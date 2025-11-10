'use client';

import { signIn, signOut, useSession } from 'next-auth/react';

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <button disabled>Comprobando sesión…</button>;

  if (session?.user) {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {session.user.image && (
          <img
            src={session.user.image}
            alt=""
            width={32}
            height={32}
            style={{ borderRadius: 999 }}
          />
        )}
        <span>{session.user.name ?? session.user.email}</span>
        <button onClick={() => signOut()}>Salir</button>
      </div>
    );
  }

  return <button onClick={() => signIn('google')}>Entrar con Google</button>;
}
