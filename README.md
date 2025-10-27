This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, add the authentication environment variables required by NextAuth. Create a `.env.local` file (this repo already ignores it) with:

```
GITHUB_ID={{PON_AQUI_TU_CLIENT_ID}}
GITHUB_SECRET={{PON_AQUI_TU_NUEVO_CLIENT_SECRET_ROTADO}}
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET={{GENERA_UNO_ALEATORIO}}
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

## Deployment notes

Add the same keys in Vercel → Project → Settings → Environment Variables before redeploying:

```
GITHUB_ID
GITHUB_SECRET
NEXTAUTH_URL=https://oneline-one.vercel.app
NEXTAUTH_SECRET
```

Rotate the GitHub OAuth client secret when you set the `GITHUB_SECRET` value.

After updating the variables and redeploying, verify the configuration at
`https://oneline-one.vercel.app/api/auth/health`. The endpoint responds with
`ok: true` when all required variables are present.
