// src/app/(auth)/login/page.tsx
import LoginCard from './LoginCard';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50 relative">
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_40%_at_50%_0%,rgba(99,102,241,.25),transparent_60%),radial-gradient(40%_60%_at_10%_90%,rgba(34,197,94,.18),transparent_60%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center justify-center p-6">
        <LoginCard />
      </div>
    </main>
  );
}
