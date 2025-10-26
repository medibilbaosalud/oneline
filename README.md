# OneLine

## Authentication & Onboarding Routes

- `/signup` – email-only account creation. Sends a verification link and polls the session so that new users land in the onboarding vault step automatically.
- `/signin` – sign-in screen without magic link. Supports Google OAuth and the classic email + password flow for legacy accounts. Honors any `redirectTo` query parameter.
- `/auth/callback` – completes Google OAuth or email verification, exchanges the Supabase code for a session, and forwards users to the `next` query (defaults to `/onboarding/vault`).
- `/onboarding/vault` – secure vault creation step. Requires an authenticated session; once the encrypted vault exists it forwards the user to the welcome screen.
- `/onboarding/done` – welcome screen with the three primary CTAs once the onboarding vault is created.
- `/app/today`, `/app/history`, `/app/settings` – thin wrappers that point to the existing productivity surfaces while keeping compatibility with the onboarding flow.

## Updating copy & redirects

- Sign-up copy lives in `src/app/signup/page.tsx`. Adjust button labels or helper text in this file.
- Sign-in copy and button text live in `src/app/signin/page.tsx`.
- The onboarding vault instructions are defined in `src/app/onboarding/vault/page.tsx` and `src/app/onboarding/vault/VaultStepClient.tsx`.
- The welcome screen content is at `src/app/onboarding/done/page.tsx`.
- Update OAuth redirect targets or Supabase client configuration in `src/lib/supabase/client.ts` and `src/lib/supabaseServer.ts`.
- Middleware routing rules (including onboarding enforcement) are implemented in `middleware.ts`.

## Development

Run the local development server with:

```bash
npm run dev
```

Lint the project with:

```bash
npm run lint
```

The application uses the Next.js App Router with Supabase SSR helpers and Tailwind CSS for styling.
