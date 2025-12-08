export const dynamic = 'force-dynamic';

export default function PrivacyPage() {
  const lastUpdated = "December 8, 2024";

  return (
    <main className="min-h-screen bg-neutral-950 text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-bold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-zinc-400">Last updated: {lastUpdated}</p>

        <div className="mt-8 space-y-8 text-zinc-300">

          {/* Intro */}
          <section>
            <p>
              At OneLine, we take your privacy seriously. This policy explains what data we collect,
              how we use it, and your rights under the General Data Protection Regulation (GDPR)
              and applicable privacy laws.
            </p>
          </section>

          {/* 1. Controller */}
          <section>
            <h2 className="text-lg font-semibold text-white">1. Data Controller</h2>
            <p className="mt-2">
              OneLine is the data controller for your personal data.
              For any privacy-related questions, contact us at:{" "}
              <span className="text-indigo-400">oneline.developerteam@gmail.com</span>
            </p>
          </section>

          {/* 2. Data we collect */}
          <section>
            <h2 className="text-lg font-semibold text-white">2. Data We Collect</h2>
            <div className="mt-2 space-y-3">
              <div>
                <h3 className="font-medium text-zinc-200">Account data:</h3>
                <ul className="ml-4 mt-1 list-disc text-sm">
                  <li>Email address</li>
                  <li>Authentication method (email/password or Google OAuth)</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-zinc-200">Journal data:</h3>
                <ul className="ml-4 mt-1 list-disc text-sm">
                  <li>Journal entries (end-to-end encrypted)</li>
                  <li>Metadata: dates, mood scores, writing streaks</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-zinc-200">Usage data:</h3>
                <ul className="ml-4 mt-1 list-disc text-sm">
                  <li>AI Coach conversation summaries (if memory is enabled)</li>
                  <li>App preferences</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 3. Legal basis */}
          <section>
            <h2 className="text-lg font-semibold text-white">3. Legal Basis for Processing</h2>
            <div className="mt-2 space-y-2 text-sm">
              <p><strong>Contract performance (Art. 6.1.b GDPR):</strong> We need your data to provide the journaling service.</p>
              <p><strong>Consent (Art. 6.1.a GDPR):</strong> For optional features like the AI Coach, we ask for your explicit consent.</p>
              <p><strong>Legitimate interest (Art. 6.1.f GDPR):</strong> To improve the service and ensure security.</p>
            </div>
          </section>

          {/* 4. Third-party services */}
          <section>
            <h2 className="text-lg font-semibold text-white">4. Third-Party Services</h2>
            <p className="mt-2 text-sm">
              We use the following service providers:
            </p>
            <div className="mt-3 space-y-4 text-sm">

              <div className="rounded-lg border border-zinc-800 p-3">
                <h3 className="font-medium text-indigo-400">Supabase (Database)</h3>
                <ul className="ml-4 mt-1 list-disc text-zinc-400">
                  <li>Location: EU (Frankfurt, Germany)</li>
                  <li>Purpose: Account data and metadata storage</li>
                  <li>Note: Journal entries are encrypted and cannot be read by Supabase</li>
                </ul>
              </div>

              <div className="rounded-lg border border-zinc-800 p-3">
                <h3 className="font-medium text-indigo-400">Groq (AI Coach)</h3>
                <ul className="ml-4 mt-1 list-disc text-zinc-400">
                  <li>Location: USA</li>
                  <li>Purpose: Power the AI Coach responses</li>
                  <li>Data: Chat messages, mood patterns (NOT encrypted entry content unless you grant access)</li>
                  <li>Retention: Messages are not permanently stored by Groq</li>
                </ul>
              </div>

              <div className="rounded-lg border border-zinc-800 p-3">
                <h3 className="font-medium text-indigo-400">Google Gemini (Story Generation)</h3>
                <ul className="ml-4 mt-1 list-disc text-zinc-400">
                  <li>Location: USA/Global</li>
                  <li>Purpose: Generate story narratives, audio, and images</li>
                  <li>Data: Decrypted entry content (only when you actively request a story)</li>
                </ul>
              </div>

              <div className="rounded-lg border border-zinc-800 p-3">
                <h3 className="font-medium text-indigo-400">Vercel (Hosting)</h3>
                <ul className="ml-4 mt-1 list-disc text-zinc-400">
                  <li>Location: Global CDN with EU nodes</li>
                  <li>Purpose: Host the web application</li>
                  <li>Data: Access logs, anonymized IP</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 5. Encryption */}
          <section>
            <h2 className="text-lg font-semibold text-white">5. End-to-End Encryption</h2>
            <p className="mt-2 text-sm">
              Your journal entries are encrypted on your device before being sent to our servers.
              Only you, with your passphrase, can decrypt them. Neither OneLine nor our service
              providers can read your entry content.
            </p>
            <p className="mt-2 text-sm text-amber-400/80">
              ⚠️ Important: If you lose your passphrase, we cannot recover your entries.
            </p>
          </section>

          {/* 6. Your rights */}
          <section>
            <h2 className="text-lg font-semibold text-white">6. Your Rights (GDPR)</h2>
            <p className="mt-2 text-sm">You have the right to:</p>
            <ul className="ml-4 mt-2 list-disc text-sm">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Correct inaccurate data</li>
              <li><strong>Erasure:</strong> Delete your account and all associated data</li>
              <li><strong>Portability:</strong> Export your data in a readable format</li>
              <li><strong>Withdraw consent:</strong> At any time, without affecting prior processing</li>
            </ul>
            <p className="mt-3 text-sm">
              You can exercise these rights from <strong>Settings → Privacy</strong> in the app or
              by contacting <span className="text-indigo-400">oneline.developerteam@gmail.com</span>
            </p>
          </section>

          {/* 7. Retention */}
          <section>
            <h2 className="text-lg font-semibold text-white">7. Data Retention</h2>
            <ul className="ml-4 mt-2 list-disc text-sm">
              <li>Account data: While your account is active</li>
              <li>Journal entries: Until you delete them or close your account</li>
              <li>Coach conversations: 30 days, then automatically deleted</li>
              <li>Usage logs: Maximum 90 days</li>
            </ul>
            <p className="mt-2 text-sm">
              When you delete your account, all your data is permanently removed within 30 days.
            </p>
          </section>

          {/* 8. Children */}
          <section>
            <h2 className="text-lg font-semibold text-white">8. Children</h2>
            <p className="mt-2 text-sm">
              OneLine is not intended for users under 16 years of age. We do not knowingly
              collect data from children. If you are a parent and believe your child has
              provided data, contact us to have it removed.
            </p>
          </section>

          {/* 9. Cookies */}
          <section>
            <h2 className="text-lg font-semibold text-white">9. Cookies</h2>
            <p className="mt-2 text-sm">
              We only use essential technical cookies for authentication and preferences.
              We do not use tracking or advertising cookies.
            </p>
          </section>

          {/* 10. Changes */}
          <section>
            <h2 className="text-lg font-semibold text-white">10. Changes to This Policy</h2>
            <p className="mt-2 text-sm">
              We may update this policy occasionally. We will notify you of significant changes
              via email or an in-app notice. The last updated date appears at the top.
            </p>
          </section>

          {/* Contact */}
          <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <h2 className="text-lg font-semibold text-white">Contact</h2>
            <p className="mt-2 text-sm">
              For any questions about this policy or your data:
            </p>
            <p className="mt-2 text-sm text-indigo-400">
              📧 oneline.developerteam@gmail.com
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}