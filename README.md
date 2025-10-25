# Oneline

Oneline is a secure journaling web app built with the Next.js App Router and Supabase. Users can capture daily entries, review their history, and generate weekly, monthly, or yearly narrative summaries that respect their saved tone and length preferences. The project is deployed on Vercel and relies on Supabase Auth, storage, and scheduled functions.

## Features

- **Today workspace** – Create and manage encrypted journal entries with Supabase Row Level Security (RLS).
- **History & detail views** – Browse past entries, edit ciphertext payloads, and delete records with optimistic UI updates.
- **Summary planner** – Configure reminder cadence, preferred story length, tone, highlights, and delivery window; preferences persist in `user_vaults`.
- **Automated recaps** – API routes and cron endpoints generate AI-powered stories and track monthly usage quotas.
- **Auth-aware navigation** – Middleware preserves `redirectTo` targets, synchronises Supabase cookies after sign-in, and guards protected routes.
- **Signup flow improvements** – Email confirmation callback exchanges Supabase codes and surfaces a dismissible “Account created.” banner.
- **Interactive visitor demo** – Landing page hotspots explain how to explore the authenticated areas, with inline “How to use” guidance.

## Tech stack

- [Next.js 14](https://nextjs.org/docs/app) App Router with React Server Components.
- [Supabase](https://supabase.com) for authentication, Postgres, RLS, and scheduled Edge Functions.
- [@supabase/auth-helpers-nextjs](https://supabase.com/docs/guides/auth/server-side/nextjs) for server/client session handling.
- [Tailwind CSS](https://tailwindcss.com) & custom dark UI components.
- AI story generation via Google Gemini (see `GEMINI_API_KEY`).

## Getting started

### Prerequisites

- Node.js 18+
- npm (or pnpm/yarn/bun)
- Supabase project with the SQL migrations in `supabase/`
- Configured OAuth/email templates in Supabase (see notes below)

### Environment variables

Create a `.env.local` file at the project root and provide:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-google-gemini-api-key
# Optional: additional provider keys used by story generation or analytics
```

Ensure the following redirect URL is added to the Supabase Auth Redirect Allow List:

```
https://oneline-cvl22fc8y-aitors-projects-69010505.vercel.app/auth/callback
```

### Database migrations

Run the SQL files in `supabase/` (timestamped). They create enum types, preference columns, and monthly usage counters in `public.user_vaults`, alongside any additional structures required by the summaries workflow. Apply them in chronological order using the Supabase SQL editor or CLI.

Example:

```bash
supabase db push --file supabase/20241024_add_summary_usage_columns.sql
supabase db push --file supabase/20241030_add_digest_story_preferences.sql
supabase db push --file supabase/20241105_move_summary_preferences_to_vaults.sql
```

### Install dependencies

```bash
npm install
```

### Run the development server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000). Protected routes (Today, History, Summaries, Settings) will redirect to `/auth` if you are not signed in.

### Linting & type checks

```bash
npm run lint
npm run build   # triggers Next.js type checks
```

> ℹ️ The build step fetches Google Fonts during prerender; in offline environments this may require a network connection.

### Testing the auth redirect flow

1. Sign out at `/auth`.
2. Navigate to `/history` → you will be redirected to `/auth?redirectTo=/history`.
3. Complete email/password sign-in → you are redirected to `/history` with your vault unlocked.
4. Confirm that `/auth/callback` handles email confirmation links by opening the Supabase verification email.

## Project structure

```
src/
  app/
    api/…                # Route handlers for entries, summaries, settings, auth callbacks, cron jobs
    auth/…               # Auth pages + callback handler
    history/…            # History list/detail pages
    summaries/…          # Summary planner and generator
    today/…              # Daily journaling experience
    visitor/…            # Marketing visitor experience
  components/…           # Shared UI components (AuthButton, banners, navigation, etc.)
  lib/…                  # Supabase clients, summary utilities, email hints, AI integrations
  types/…                # Domain type definitions (e.g., journal enums)
supabase/
  *.sql                  # Database migrations referenced above
```

## Deployment

- The production site runs on Vercel (see `vercel.json`).
- Middleware (`middleware.ts`) guards protected paths and forwards Supabase cookies.
- Ensure environment variables are set in Vercel for Production and Preview deployments.
- Supabase email templates should use the custom dark-themed HTML in `emails/confirm-signup.html`.

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-change`.
3. Run lint/type checks before pushing.
4. Open a PR summarising the change and any migrations required.

## Support

For Supabase environment issues (e.g., missing redirect URLs, RLS policies) consult the Supabase docs or open an issue. For UI/UX questions, document them in the repository discussions or issue tracker.

