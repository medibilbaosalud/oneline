export const dynamic = 'force-dynamic';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Privacy Policy</h1>
        <p className="mt-4 text-zinc-300">
          We store your account data (email) and your journal entries to provide the service.
          You can export or delete your data at any time from Settings. We don&apos;t sell your data.
        </p>
      </div>
    </main>
  );
}