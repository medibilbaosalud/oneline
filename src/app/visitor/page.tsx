// src/app/visitor/page.tsx
import VisitorExperience from './VisitorExperience';

export const metadata = {
  title: 'Visitor mode — OneLine',
  description: 'Preview the OneLine interface in read-only mode before creating your encrypted account.',
};

export default function VisitorPage() {
  return <VisitorExperience />;
}
