// src/app/year-story/page.tsx
import YearStoryClient from './YearStoryClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Year story — OneLine',
};

export default function YearStoryPage() {
  return <YearStoryClient />;
}
