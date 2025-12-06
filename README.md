This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, add the Supabase environment variables so the client libraries can authenticate. Create a `.env.local` file (this repo already ignores it) with:

```
NEXT_PUBLIC_SUPABASE_URL=<your Supabase project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your Supabase anon key>
SUPABASE_SERVICE_ROLE_KEY=<optional — required for background jobs and admin routes>
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Privacy and data handling

- Entries are encrypted in the browser with your passphrase (AES-GCM) before anything is sent.
- Only ciphertext plus IVs are stored in Supabase Postgres; plaintext never hits the server or logs.
- Export/delete controls help you exercise GDPR/Spanish data rights at any time.
- Interface copy stays in English for clarity, but you can journal and summarise in any language.

## Deployment notes

### Production deployment

Add these keys in Vercel → Project → Settings → Environment Variables (Production) before redeploying:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

### Preview setup

For Vercel preview deployments, add at least `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. If background jobs or admin endpoints are required in previews, also add `SUPABASE_SERVICE_ROLE_KEY`.

### Today page sources and deploy verification

- The Today page renders from `src/app/today` in the web app and from `mobile-build/src/app/today` in the Expo/mobile bundle. Update both when changing entry actions (including the dictation button) to keep web and mobile in sync.
- To confirm the live site is serving the latest commit, compare `git rev-parse --short HEAD` locally with the commit hash shown on the Vercel deployment page. Trigger a fresh deployment if the hashes differ.
- If cached assets obscure UI changes (for example, a missing dictation button), hard-refresh the browser or open the site in a private window to bypass stale Next.js chunks.

## Progressive Web App

The app ships with a web manifest, vector maskable icons, and a lightweight service worker (`public/sw.js`) so OneLine can be installed from desktop or mobile browsers.

1. Install dependencies if you haven’t already:

   ```bash
   npm install
   ```

2. Build locally, start the production server, and confirm Lighthouse → **Progressive Web App** marks the site as “Installable”:

   ```bash
   npm run build
   npm run start
   ```

3. Deploy to Vercel. Ensure the Supabase environment variables listed above are present in both Preview and Production so the service worker runs on the Node.js runtime and authenticated routes work everywhere.

4. After the deployment finishes, open the Preview URL, run Lighthouse, and confirm the **Installable** checklist is green. Repeat on production (`https://oneline-one.vercel.app`).

### iOS and Android install hints

* Apple devices use the `apple-touch-icon` and `apple-mobile-web-app-capable` metadata exposed in `app/layout.tsx`.
* Android/Chrome reads `manifest.webmanifest` and the static `sw.js`. Both files live under `public/` and are served directly by Next.js.

If Lighthouse reports the app isn’t installable, double-check that the manifest is served at `/manifest.webmanifest`, the icons exist under `/icons/`, and `sw.js` is accessible in the built output.
