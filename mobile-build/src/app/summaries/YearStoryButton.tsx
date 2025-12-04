// src/app/summaries/YearStoryButton.tsx
'use client';

import { useState } from 'react';

export default function YearStoryButton() {
  const [loading, setLoading] = useState(false);
  const [story, setStory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setStory(null);
    try {
      const res = await fetch('/api/year-story?from=2025-01-01&to=2025-12-31', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error generating story');
      setStory(json.story);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate story');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={run}
        disabled={loading}
        className="rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white hover:bg-indigo-400 disabled:opacity-40"
      >
        {loading ? 'Generating…' : 'Generate your story'}
      </button>

      {error && <p className="text-rose-400 text-sm">{error}</p>}

      {story && (
        <article className="prose prose-invert max-w-none">
          {/* For now we render markdown as text; feed it through a parser for HTML */}
          <pre className="whitespace-pre-wrap">{story}</pre>
        </article>
      )}
    </div>
  );
}
