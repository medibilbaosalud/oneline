import StoryGenerator from "./StoryGenerator";

export default function SummariesPage() {
  return (
    <main className="min-h-screen bg-black">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-3xl font-semibold text-zinc-100">Summaries</h1>
        <p className="mt-1 text-zinc-400">Generate a story from your journal.</p>

        <div className="mt-8">
          <StoryGenerator />
        </div>
      </div>
    </main>
  );
}