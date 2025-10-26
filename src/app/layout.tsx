// src/app/layout.tsx
import './globals.css';
import TopNav from '@/components/TopNav';

export const metadata = {
  title: 'OneLine',
  description: 'One honest line a day.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-neutral-950">
      <body className="min-h-screen bg-neutral-950 text-zinc-100 font-sans">
        {/* Global navigation across all pages */}
        <TopNav />
        {children}
      </body>
    </html>
  );
}