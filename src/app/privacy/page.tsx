// src/app/privacy/page.tsx
export const metadata = { title: "Privacy Policy — OneLine" };

export default function PrivacyPage() {
  return (
    <main className="prose prose-invert mx-auto max-w-3xl px-6 py-10">
      <h1>Privacy Policy</h1>
      <p>Last updated: {new Date().toISOString().slice(0,10)}</p>

      <p>
        This policy explains what personal data we collect, why, how we process it,
        who we share it with (e.g., hosting and database providers), and your rights.
      </p>

      <h2>Data we collect</h2>
      <ul>
        <li>Account data (email via Google sign-in).</li>
        <li>Journal entries you write.</li>
        <li>Technical logs for security and reliability.</li>
      </ul>

      <h2>How we use your data</h2>
      <ul>
        <li>Provide and improve the service.</li>
        <li>Security and abuse prevention.</li>
        <li>Optional product updates (if you opt-in).</li>
      </ul>

      <h2>Legal basis</h2>
      <p>Consent; contract performance; legitimate interests.</p>

      <h2>Retention</h2>
      <p>We keep data as long as your account is active or as required by law.</p>

      <h2>Your rights</h2>
      <p>Access, rectification, deletion, portability, restriction, and objection. Contact us at support@example.com.</p>

      <h2>International transfers</h2>
      <p>We use reputable providers. Standard contractual clauses may apply.</p>

      <h2>Children</h2>
      <p>OneLine is not intended for children under the applicable digital age of consent.</p>

      <h2>Changes</h2>
      <p>We may update this policy; we’ll notify you of material changes.</p>
    </main>
  );
}