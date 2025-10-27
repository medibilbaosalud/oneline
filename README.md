This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, add the authentication environment variables required by NextAuth. Create a `.env.local` file (this repo already ignores it) with:

```
GITHUB_ID={{PON_AQUI_TU_CLIENT_ID}}
GITHUB_SECRET={{PON_AQUI_TU_NUEVO_CLIENT_SECRET_ROTADO}}
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET={{GENERA_UNO_ALEATORIO}}
```

> **Note:** When these environment variables are not provided, the application now falls back to the production credentials:
> `GITHUB_ID=Ov23liMbWH3KxtbeLdqT`, `GITHUB_SECRET=9787e851ac01d58fa859152942e079f7322a76b7`, `NEXTAUTH_SECRET=reQegr7kph5nyK82UJ9zZ5UnYU6SG/cf+UBaIioDXWs=`, `NEXTAUTH_URL=https://oneline-one.vercel.app`.
> Configure your own values before deploying to a different environment.

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
GITHUB_ID=Ov23liMbWH3KxtbeLdqT
GITHUB_SECRET=9787e851ac01d58fa859152942e079f7322a76b7
NEXTAUTH_URL=https://oneline-one.vercel.app
NEXTAUTH_SECRET=reQegr7kph5nyK82UJ9zZ5UnYU6SG/cf+UBaIioDXWs=
```

Rotate the GitHub OAuth client secret if you replace the bundled default value with a new one.

After updating the variables and redeploying, verify the configuration at
`https://oneline-one.vercel.app/api/auth/health`. The endpoint responds with
`ok: true` when all required variables are present.
