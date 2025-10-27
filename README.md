This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, add the authentication environment variables required by NextAuth. Create a `.env.local` file (this repo already ignores it) with:

```
GITHUB_ID=<your GitHub OAuth client id>
GITHUB_SECRET=<your GitHub OAuth client secret>
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<random 32+ byte base64 string>
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

To verify the authentication configuration locally or in CI, set `NEXTAUTH_URL` and run:

```bash
NEXTAUTH_URL=http://localhost:3000 npm run test:auth-health
```

The command calls `/api/auth/health` and prints the diagnostic JSON so you can confirm all required environment variables are present (the script tolerates non-200 responses so you can review the payload).

## Deployment notes

Add the same keys in Vercel → Project → Settings → Environment Variables before redeploying:

```
GITHUB_ID
GITHUB_SECRET
NEXTAUTH_URL=https://oneline-one.vercel.app
NEXTAUTH_SECRET
```

Rotate the GitHub OAuth client secret if you replace it with a new one.

After updating the variables and redeploying, verify the configuration at `https://oneline-one.vercel.app/api/auth/health`. The endpoint responds with `ok: true` when all required variables are present.

## GitHub OAuth redirect mismatch — how to fix

1. **Quick unblock:** Copy the exact `redirect_uri` from the browser URL (or the error page) and add it under **Authorization callback URL** inside your GitHub OAuth App.
2. **Recommended:** Set `NEXTAUTH_URL` in Vercel to your canonical production domain and redeploy so NextAuth always generates the correct redirect URL. Keep `http://localhost:3000` configured in your GitHub OAuth App for local development.
3. **Optional for previews:** If you rely on Vercel preview deployments, register a separate GitHub OAuth App for previews or temporarily add the preview URL to the callback list.
