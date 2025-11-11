"use client";

import { useSession } from 'next-auth/react';

export default function DebugSession() {
  const { data, status } = useSession();
  return (
    <pre style={{ padding: 16 }}>{JSON.stringify({ status, user: data?.user }, null, 2)}</pre>
  );
}
