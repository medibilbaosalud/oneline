This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, add the authentication environment variables required by NextAuth. Create a `.env.local` file (this repo already ignores it) with:

```
GITHUB_ID=<your GitHub OAuth client id>
GITHUB_SECRET=<your GitHub OAuth client secret>
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<random 32+ byte base64 string>
# Optional (mirrors the production proxy behaviour for previews)
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
AUTH_REDIRECT_PROXY_URL=https://oneline-one.vercel.app/api/auth
```

Rotate the GitHub OAuth client secret if you replace it with a new one.

After updating the variables and redeploying, verify the configuration at `https://oneline-one.vercel.app/api/auth/health`. The endpoint responds with `ok: true` when all required variables are present.

## Preview setup

For Vercel preview deployments, add these environment variables in the Preview environment before triggering a build:

```
GITHUB_ID
GITHUB_SECRET
NEXTAUTH_SECRET
NEXTAUTH_URL=https://oneline-one.vercel.app
AUTH_REDIRECT_PROXY_URL=https://oneline-one.vercel.app/api/auth
```

NextAuth will proxy preview callbacks through your production domain, so GitHub only needs a single callback URL.

Open your GitHub OAuth App (GitHub → Settings → Developer settings → OAuth Apps) and ensure the **Authorization callback URL** matches exactly `https://oneline-one.vercel.app/api/auth/callback/github`.

## GitHub OAuth redirect mismatch — how to fix

1. Confirm `NEXTAUTH_URL=https://oneline-one.vercel.app` and `AUTH_REDIRECT_PROXY_URL=https://oneline-one.vercel.app/api/auth` exist in the relevant Vercel environment (Production and Preview) and redeploy.
2. Rotate and paste your GitHub OAuth credentials into `GITHUB_ID` and `GITHUB_SECRET`, and generate a new `NEXTAUTH_SECRET` with `openssl rand -base64 32` if needed.
3. In GitHub → Settings → Developer settings → OAuth Apps, ensure the **Authorization callback URL** is exactly `https://oneline-one.vercel.app/api/auth/callback/github`. Local development can keep `http://localhost:3000/api/auth/callback/github` on a separate dev app if required.
4. Visit `/api/auth/health` (locally or on the deployment) to verify `ok: true` before retrying the login.
