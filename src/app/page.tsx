export default function Home() {
  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <div className="max-w-3xl mx-auto p-8">
        <h1 className="text-2xl font-semibold">OneLine</h1>
        <p className="mt-2 text-zinc-400">
          Go to <a href="/summaries" className="underline">Summaries</a> to generate your story.
        </p>
      </div>
    </main>
  );
}