This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, add the authentication environment variables required by NextAuth. Create a `.env.local` file (this repo already ignores it) with:

```
GITHUB_ID=<your GitHub OAuth client id>
GITHUB_SECRET=<your GitHub OAuth client secret>
NEXTAUTH_SECRET=<random 32+ byte base64 string>
# Optional: Auth.js also supports AUTH_SECRET
# AUTH_SECRET=<random 32+ byte base64 string>
# Optional (mirrors the production proxy behaviour for previews)
# AUTH_URL=http://localhost:3000
# AUTH_REDIRECT_PROXY_URL=https://oneline-one.vercel.app/api/auth
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

### Health check

To verify the authentication configuration locally or in CI, set `NEXTAUTH_URL` (or `AUTH_URL`) and run:

```bash
NEXTAUTH_URL=http://localhost:3000 npm run test:auth-health
```

The command calls `/api/auth/health` and prints the diagnostic JSON so you can confirm all required environment variables are present (the script tolerates non-200 responses so you can review the payload).

To validate production quickly, run:

```bash
npm run check-auth
```

The script fetches `https://oneline-one.vercel.app/api/auth/health` and exits non-zero if `ok` is not `true`.

## Deployment notes

### Production deployment

Add these keys in Vercel → Project → Settings → Environment Variables (Production) before redeploying:

```
GITHUB_ID
GITHUB_SECRET
NEXTAUTH_SECRET (or AUTH_SECRET)
AUTH_URL=https://oneline-one.vercel.app
AUTH_REDIRECT_PROXY_URL=https://oneline-one.vercel.app/api/auth
AUTH_TRUST_HOST=true
```

Rotate the GitHub OAuth client secret if you replace it with a new one.

After updating the variables and redeploying, verify the configuration at `https://oneline-one.vercel.app/api/auth/health`. The endpoint responds with `ok: true` when all required variables are present.

### Preview setup

For Vercel preview deployments, add these environment variables in the Preview environment before triggering a build:

```
GITHUB_ID
GITHUB_SECRET
NEXTAUTH_SECRET (or AUTH_SECRET)
AUTH_REDIRECT_PROXY_URL=https://oneline-one.vercel.app/api/auth
AUTH_TRUST_HOST=true
```

Avoid setting `AUTH_URL` or `NEXTAUTH_URL` in previews so Auth.js uses the preview host while proxying callbacks back to production via `AUTH_REDIRECT_PROXY_URL`. For additional diagnostics (non-production only), you can add `DEBUG="auth*,next-auth*"` to preview environments to mirror the local redirect logs.

Open your GitHub OAuth App (GitHub → Settings → Developer settings → OAuth Apps) and ensure the **Authorization callback URL** matches exactly `https://oneline-one.vercel.app/api/auth/callback/github`. Preview builds reuse this canonical callback through `AUTH_REDIRECT_PROXY_URL`, so no additional preview callbacks are required.

## GitHub OAuth redirect mismatch — how to fix

1. Confirm `AUTH_URL=https://oneline-one.vercel.app` (production only) and `AUTH_REDIRECT_PROXY_URL=https://oneline-one.vercel.app/api/auth` exist in the relevant Vercel environment and redeploy.
2. Rotate and paste your GitHub OAuth credentials into `GITHUB_ID` and `GITHUB_SECRET`, and generate a new `NEXTAUTH_SECRET` (or `AUTH_SECRET`) with `openssl rand -base64 32` if needed.
3. In GitHub → Settings → Developer settings → OAuth Apps, ensure the **Authorization callback URL** is exactly `https://oneline-one.vercel.app/api/auth/callback/github`. Local development can keep `http://localhost:3000/api/auth/callback/github` on a separate dev app if required.
4. Visit `/api/auth/health` (locally or on the deployment) to verify `ok: true` before retrying the login.

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

3. Deploy to Vercel. Ensure these environment variables are present in both Preview and Production so previews proxy to the production callback while the service worker runs on the Node.js runtime:

   ```
   AUTH_URL=https://oneline-one.vercel.app
   AUTH_REDIRECT_PROXY_URL=https://oneline-one.vercel.app/api/auth
   AUTH_TRUST_HOST=true
   GITHUB_ID
   GITHUB_SECRET
   NEXTAUTH_SECRET (or AUTH_SECRET)
   ```

4. After the deployment finishes, open the Preview URL, run Lighthouse, and confirm the **Installable** checklist is green. Repeat on production (`https://oneline-one.vercel.app`).

### iOS and Android install hints

* Apple devices use the `apple-touch-icon` and `apple-mobile-web-app-capable` metadata exposed in `app/layout.tsx`.
* Android/Chrome reads `manifest.webmanifest` and the static `sw.js`. Both files live under `public/` and are served directly by Next.js.

If Lighthouse reports the app isn’t installable, double-check that the manifest is served at `/manifest.webmanifest`, the icons exist under `/icons/`, and `sw.js` is accessible in the built output.
