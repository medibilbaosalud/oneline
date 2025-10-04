// src/app/summaries/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import SummariesClient from './SummariesClient';
import YearStoryButton from './YearStoryButton';

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      {/* Tu lista de resúmenes */}
      <SummariesClient />

      {/* Acción extra opcional */}
      <div className="mt-8">
        <YearStoryButton />
      </div>
    </div>
  );
}
