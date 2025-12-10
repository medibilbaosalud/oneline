---
description: Pre-push checklist to prevent build failures on Vercel
---

# Pre-Push Build Verification

Run these checks BEFORE pushing to prevent Vercel build failures.

---

// turbo-all
## Quick Check (Run This Before Every Push)

```bash
# Run the build locally - this catches ALL TypeScript errors
npm run build
```

If the build passes locally, it will pass on Vercel.

---

## Common Build Failure Categories

### 1. TypeScript Type Errors
See `/supabase-typescript-errors` workflow for Supabase-specific fixes.

### 2. Missing Dependencies
```bash
npm install
```

### 3. ESLint Errors
```bash
npm run lint
```

---

## Emergency Fix Flow

If Vercel build fails after push:

1. Copy the exact error message from Vercel logs
2. The error shows the file and line number - go directly there
3. Apply the fix from the relevant workflow documentation
4. Test locally with `npm run build`
5. Push the fix

---

## Files Most Likely to Cause Build Errors

- `src/app/_components/*.tsx` - Auth components
- `src/components/*.tsx` - Client components with Supabase
- `src/hooks/*.ts` - Hooks using Supabase queries
- `src/lib/supabase*.ts` - Supabase client helpers
