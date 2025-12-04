// src/app/terms/page.tsx
export const metadata = { title: "Terms of Service — OneLine" };

const lastUpdated = new Date().toISOString().slice(0, 10);

export default function TermsPage() {
  return (
    <main className="prose prose-invert mx-auto max-w-3xl px-6 py-10">
      <h1>Terms of Service</h1>
      <p>Last updated: {lastUpdated}</p>

      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of OneLine (the
        &ldquo;Service&rdquo;), operated by the OneLine project team based in Bilbao, Basque Country, Spain
        (&ldquo;OneLine&rdquo;, &ldquo;we&rdquo;, or &ldquo;us&rdquo;). By creating an account, checking the acceptance box during
        signup, or using the Service you agree to be legally bound by these Terms.
      </p>

      <h2>Eligibility and Account Registration</h2>
      <ul>
        <li>You must be at least 16 years old or the minimum digital age of consent in your country.</li>
        <li>
          You are responsible for maintaining the confidentiality of your login credentials and for all
          activity that occurs under your account, as well as the passphrase that unlocks your encrypted
          journal. We never store your passphrase; losing or changing it will render previously encrypted
          entries permanently unreadable.
        </li>
        <li>You must provide accurate and complete information when creating your account.</li>
      </ul>

      <h2>Use of the Service</h2>
      <ul>
        <li>
          You may use the Service solely for personal journaling purposes and in accordance with these
          Terms and applicable law.
        </li>
        <li>
          You must not upload unlawful, infringing, or harmful content, nor attempt to interfere with the
          security or proper functioning of the Service.
        </li>
        <li>
          We may update, modify, or discontinue features at any time with reasonable notice when
          possible.
        </li>
      </ul>

      <h2>Your Content</h2>
      <p>
        You retain ownership of the text you store in the Service. By submitting content you grant OneLine a
        non-exclusive, revocable, worldwide licence to host, store, back up, and process that content solely
        for the purpose of providing and improving the Service. Journal entries are encrypted on your device
        with AES-GCM using a passphrase you control before they reach our infrastructure. We store only
        ciphertext, initialization vectors, and related metadata. We do not use your journal entries for
        advertising or training third-party models without your explicit consent.
      </p>

      <h2>Subscriptions and Payment</h2>
      <p>
        Where the Service includes paid features, fees are disclosed before purchase. Payments are
        non-refundable except where required by law. We may change prices with at least 30 days&apos; notice,
        after which continued use constitutes acceptance of the new price.
      </p>

      <h2>Termination</h2>
      <p>
        You may delete your account at any time by contacting support. We may suspend or terminate your
        access if you materially breach these Terms, if required by law, or for security reasons. Upon
        termination we will delete or anonymise your content unless retention is required by law.
      </p>

      <h2>Security and Encryption</h2>
      <p>
        We protect the Service with technical and organisational measures, including TLS, hardened
        infrastructure, and regular reviews. Journal entries are encrypted on your device using AES-GCM and a
        passphrase-derived key before they are transmitted to us. We cannot decrypt your journal and do not
        store your passphrase. You are solely responsible for safeguarding it; if it is lost or altered, we
        cannot recover your plaintext data.
      </p>

      <h2>Disclaimer and Limitation of Liability</h2>
      <p>
        The Service is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without warranties of any kind.
        To the maximum extent permitted by law, OneLine and its collaborators shall not be liable for any
        indirect, consequential, punitive, or incidental damages, or for loss of profits, revenue, data, or
        goodwill arising out of your use of the Service.
      </p>

      <h2>Indemnity</h2>
      <p>
        You agree to indemnify and hold OneLine harmless from any claims, damages, liabilities, or expenses
        arising out of your content or your breach of these Terms.
      </p>

      <h2>Governing Law and Jurisdiction</h2>
      <p>
        These Terms are governed by Spanish law. Any disputes shall be subject to the exclusive
        jurisdiction of the courts of Bilbao, Spain, without prejudice to mandatory rights available to
        consumers under applicable EU law.
      </p>

      <h2>Changes to These Terms</h2>
      <p>
        We may update these Terms to reflect operational, legal, or regulatory changes. We will provide
        notice of material changes by email or in-product notification. Continued use of the Service after
        the effective date constitutes acceptance of the revised Terms.
      </p>

      <h2>Contact</h2>
      <p>
        For questions about these Terms, contact us at
        <a href="mailto:oneline.developerteam@gmail.com"> oneline.developerteam@gmail.com</a>.
      </p>
    </main>
  );
}
