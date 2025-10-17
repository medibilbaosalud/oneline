// src/app/privacy/page.tsx
export const metadata = { title: "Privacy Policy — OneLine" };

const lastUpdated = new Date().toISOString().slice(0, 10);

export default function PrivacyPage() {
  return (
    <main className="prose prose-invert mx-auto max-w-3xl px-6 py-10">
      <h1>Privacy Policy</h1>
      <p>Last updated: {lastUpdated}</p>

      <p>
        This Privacy Policy describes how OneLine Labs S.L., registered in Spain with its principal place
        of business in Madrid (&ldquo;OneLine&rdquo;, &ldquo;we&rdquo;, or &ldquo;us&rdquo;), collects, uses, and protects your personal
        data when you access or use the OneLine journaling application (the &ldquo;Service&rdquo;). We process
        personal data in accordance with Regulation (EU) 2016/679 (GDPR) and applicable Spanish data
        protection law.
      </p>

      <h2>Data Controller and Contact</h2>
      <p>
        The data controller is OneLine Labs S.L. You can reach us at
        <a href="mailto:privacy@oneline.app"> privacy@oneline.app</a>. We are registered in Spain and
        supervised by the Spanish Data Protection Agency (AEPD).
      </p>

      <h2>Personal Data We Collect</h2>
      <ul>
        <li>
          <strong>Account information:</strong> email address and authentication credentials necessary to
          create and maintain your account.
        </li>
        <li>
          <strong>Journal content:</strong> the entries you choose to store in the Service. Entries are
          private by default and only visible to you.
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
        <li>To provide, secure, and maintain the Service, including syncing your entries across devices.</li>
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
        <a href="mailto:privacy@oneline.app"> privacy@oneline.app</a>. You also have the right to lodge a
        complaint with the AEPD or your local supervisory authority.
      </p>

      <h2>Children</h2>
      <p>
        The Service is not directed to individuals under 16 years old. We do not knowingly collect personal
        data from children. If we learn that a child has provided us with personal data, we will delete it.
      </p>

      <h2>Security</h2>
      <p>
        We implement technical and organisational measures, including encryption in transit and at rest,
        access controls, and regular security reviews, to protect personal data against unauthorised access,
        loss, or disclosure.
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
