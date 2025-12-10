---
description: How to fix common TypeScript errors with Supabase SSR in Next.js 15+
---

# Supabase SSR TypeScript Errors - Quick Fix Guide

This project uses `@supabase/ssr` (NOT `@supabase/auth-helpers-nextjs`). These are the common TypeScript errors and how to fix them.

---

## Error 1: `Parameter 'event' implicitly has an 'any' type` in `onAuthStateChange`

**Example error:**
```
Type error: Parameter 'event' implicitly has an 'any' type.
supabase.auth.onAuthStateChange((event, session) => { ... })
```

**Solution:**
```typescript
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
  // your code
});
```

---

## Error 2: `Binding element 'data' implicitly has an 'any' type` in `.then()`

**Example error:**
```
Type error: Binding element 'data' implicitly has an 'any' type.
supabase.auth.getUser().then(({ data }) => { ... })
```

**Solution:** Convert `.then()` to `async/await`:
```typescript
// BEFORE (causes error):
supabase.auth.getUser().then(({ data }) => {
  if (data.user) router.replace('/today');
});

// AFTER (correct):
(async () => {
  const { data } = await supabase.auth.getUser();
  if (data.user) router.replace('/today');
})();
```

---

## Error 3: `Untyped function calls may not accept type arguments` with `.maybeSingle<T>()`

**Example error:**
```
Type error: Untyped function calls may not accept type arguments.
.maybeSingle<{ has_passphrase: boolean }>()
```

**Solution:** Remove the generic and use type assertion:
```typescript
// BEFORE (causes error):
const { data } = await supabase
  .from('table')
  .select('column')
  .maybeSingle<{ column: string }>();

// AFTER (correct):
const { data } = await supabase
  .from('table')
  .select('column')
  .maybeSingle();

const row = data as { column: string };
```

---

## Error 4: `this.context.cookies(...).get is not a function`

**Cause:** Mixing `@supabase/auth-helpers-nextjs` (old) with `@supabase/ssr` (new).

**Solution:** Ensure ALL files use `@supabase/ssr`:

1. **Client components:** Use `supabaseBrowser()` from `@/lib/supabaseBrowser`
2. **Server components:** Use `supabaseServer()` from `@/lib/supabaseServer`
3. **API routes:** Use `supabaseRouteHandler()` from `@/lib/supabaseRouteHandler`
4. **Middleware:** Use `createServerClient` from `@supabase/ssr`

**Check for old imports:**
```bash
grep -r "@supabase/auth-helpers-nextjs" src/
```
This should return NO results.

---

## Prevention Checklist

Before pushing code that touches Supabase:

1. [ ] No imports from `@supabase/auth-helpers-nextjs`
2. [ ] All `onAuthStateChange` callbacks have typed parameters
3. [ ] No `.then(({ data }) => ...)` patterns - use async/await
4. [ ] No generic type arguments on `.maybeSingle<T>()` or `.single<T>()`
5. [ ] Run `npm run build` locally before pushing

---

// turbo-all
## Quick Verification Commands

```bash
# Check for old Supabase imports (should return nothing)
grep -r "@supabase/auth-helpers-nextjs" src/

# Check for untyped onAuthStateChange (fix any results)
grep -rn "onAuthStateChange((" src/ --include="*.ts" --include="*.tsx"

# Check for .then patterns with destructuring (convert to async/await)
grep -rn "\.then(({ " src/ --include="*.ts" --include="*.tsx"

# Run TypeScript check
npx tsc --noEmit
```
