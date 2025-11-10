import AuthButton from '@/app/components/AuthButton';

export default function Page() {
  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', gap: 16 }}>
      <h1>Demo Google Sign-In</h1>
      <AuthButton />
    </main>
  );
}
