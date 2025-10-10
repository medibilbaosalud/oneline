// src/app/terms/page.tsx
export const metadata = { title: "Terms of Service — OneLine" };

export default function TermsPage() {
  return (
    <main className="prose prose-invert mx-auto max-w-3xl px-6 py-10">
      <h1>Terms of Service</h1>
      <p>Welcome to OneLine. By using the service you agree to these terms.</p>

      <h2>Use of the Service</h2>
      <ul>
        <li>You must be old enough to use the service in your country.</li>
        <li>You are responsible for your account and content.</li>
      </ul>

      <h2>Intellectual Property</h2>
      <p>You own your content; you grant us a limited license to store and process it to provide the service.</p>

      <h2>Termination</h2>
      <p>We may suspend accounts for violations. You can delete your account anytime (see Settings).</p>

      <h2>Disclaimer & Liability</h2>
      <p>Service is provided “as is”; to the maximum extent permitted by law, we limit our liability.</p>

      <h2>Governing Law</h2>
      <p>Specify your jurisdiction here.</p>
    </main>
  );
}