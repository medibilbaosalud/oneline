// src/app/(auth)/login/page.tsx
import LoginCard from './LoginCard';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(60%_40%_at_50%_0%,rgba(99,102,241,.25),transparent_60%)_0_0/100%_100%,radial-gradient(40%_60%_at_80%_0%,rgba(34,197,94,.18),transparent_60%)_100%_0/100%_100%] bg-neutral-950 text-neutral-50">
      <div className="mx-auto max-w-3xl p-6 pt-24">
        <LoginCard />
      </div>
    </main>
  );
}
