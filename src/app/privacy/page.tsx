// src/app/privacy/page.tsx
export const metadata = { title: "Privacy Policy — OneLine" };
export const dynamic = 'force-dynamic';

const lastUpdated = new Date().toISOString().slice(0, 10);

export default function PrivacyPage() {
  return (
    <main className="prose prose-invert mx-auto max-w-3xl px-6 py-10">
      <h1>Privacy Policy</h1>
      <p>Last updated: {lastUpdated}</p>

      <p>
        This Privacy Policy explains how OneLine (&ldquo;OneLine&rdquo;, &ldquo;we&rdquo;, or &ldquo;us&rdquo;), a privacy-first journaling
        product built and operated from Bilbao, Basque Country, Spain, collects and protects your personal
        data when you use the OneLine application (the &ldquo;Service&rdquo;). We process personal data in accordance
        with Regulation (EU) 2016/679 (GDPR) and applicable Spanish data protection law.
      </p>

      <h2>Data Controller and Contact</h2>
      <p>
        The data controller for the Service is the OneLine project team based in Bilbao, Basque Country,
        Spain. You can reach us at
        <a href="mailto:oneline.developerteam@gmail.com"> oneline.developerteam@gmail.com</a>. Our lead
        supervisory authority is the Spanish Data Protection Agency (AEPD).
      </p>

      <h2>Personal Data We Collect</h2>
      <ul>
        <li>
          <strong>Account information:</strong> email address and authentication credentials necessary to
          create and maintain your account.
        </li>
        <li>
          <strong>Journal content:</strong> the entries you choose to store in the Service. Journal entries
          are end-to-end encrypted (E2EE) in your browser using a passphrase only you know before they are
          transmitted to our infrastructure. We store only ciphertext, encryption metadata (such as IVs and
          key versions), and optional analytics about streak progress.
        </li>
        <li>
          <strong>Usage and technical data:</strong> log data, IP address, device and browser details, and
          diagnostics generated when you use the Service.
        </li>
        <li>
          <strong>Support communications:</strong> messages you send to us for help or feedback.
        </li>
      </ul>

      <h2>How and Why We Use Personal Data</h2>
      <ul>
        <li>
          To provide, secure, and maintain the Service, including storing your encrypted entries and
          enabling you to decrypt them with your passphrase. We cannot read your entries because the
          decryption key never leaves your devices.
        </li>
        <li>To authenticate you, prevent fraud, and enforce our Terms of Service.</li>
        <li>To communicate with you about updates, features, or legal notices.</li>
        <li>To comply with legal obligations and respond to lawful requests from authorities.</li>
        <li>To analyse anonymised or aggregated usage trends to improve the Service.</li>
      </ul>

      <h2>Legal Bases for Processing</h2>
      <p>
        We process personal data under Article 6 GDPR on the following bases: (a) performance of our
        contract with you (providing the Service); (b) legitimate interests in securing and improving the
        Service (we balance these interests against your rights); (c) compliance with legal obligations; and
        (d) your consent where required, such as for optional communications.
      </p>

      <h2>Sharing and International Transfers</h2>
      <p>
        We share personal data only with trusted subprocessors that provide hosting, storage, analytics,
        customer support, or email delivery. Whenever data is transferred outside the European Economic
        Area, we rely on an adequacy decision or European Commission Standard Contractual Clauses and
        implement additional safeguards as necessary.
      </p>

      <h2>Data Retention</h2>
      <p>
        We retain your personal data for as long as your account is active and for a reasonable period
        thereafter to comply with legal obligations, resolve disputes, or enforce agreements. Journal
        entries are deleted when you erase them or close your account, subject to limited backups kept for
        disaster recovery.
      </p>

      <h2>Your Rights</h2>
      <p>
        You have the right to access, rectify, erase, and port your data, to restrict or object to certain
        processing, and to withdraw consent at any time without affecting the lawfulness of processing based
        on consent before its withdrawal. To exercise your rights, contact us at
        <a href="mailto:oneline.developerteam@gmail.com"> oneline.developerteam@gmail.com</a>. You also have
        the right to lodge a complaint with the AEPD or your local supervisory authority.
      </p>

      <h2>Children</h2>
      <p>
        The Service is not directed to individuals under 16 years old. We do not knowingly collect personal
        data from children. If we learn that a child has provided us with personal data, we will delete it.
      </p>

      <h2>Security and End-to-End Encryption</h2>
      <p>
        We implement technical and organisational measures, including TLS in transit, hardened
        infrastructure, and regular reviews, to protect personal data. Journal entries are additionally
        protected with end-to-end encryption: your passphrase derives a key locally, entries are encrypted
        with AES-GCM before leaving your device, and only ciphertext is stored. We do not store or have
        access to your passphrase. If you forget your passphrase you will lose access to encrypted entries,
        so please keep it safe.
      </p>

      <h2>Optional AI Summaries</h2>
      <p>
        We will only process decrypted journal content for AI-powered summaries when you provide explicit
        consent in the application and confirm the passphrase locally to decrypt the data. The decrypted
        text is sent to our servers solely for that request and shared with the selected AI provider. You
        may withdraw consent at any time.
      </p>

      <h2>Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time to reflect operational or legal changes. We will
        notify you of material updates through the Service or by email. Continued use after the effective
        date indicates your acceptance of the revised policy.
      </p>
    </main>
  );
}
